import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';

import type { ListStudioShowsQueryTransformed } from '@eridu/api-types/task-management';

import type { StudioShowsQueryWithAttention } from './task-orchestration.types';

import { HttpError } from '@/lib/errors/http-error.util';
import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import {
  showDto,
  showDtoListInclude,
} from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { TaskService } from '@/models/task/task.service';
import { ShiftAlignmentService } from '@/orchestration/shift-alignment/shift-alignment.service';

/** Read-side: studio-scoped show + task retrieval for the task pages. */
@Injectable()
export class TaskRetrievalService {
  constructor(
    private readonly taskService: TaskService,
    private readonly showService: ShowService,
    private readonly studioService: StudioService,
    private readonly shiftAlignmentService: ShiftAlignmentService,
  ) {}

  /**
   * Gets all tasks for a specific show, ordered by type.
   */
  async getShowTasks(studioUid: string, showUid: string) {
    const show = await this.showService.getShowById(showUid);

    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || show.studioId !== studio.id) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }

    const tasks = await this.taskService.findTasksByShowIds([show.id], {
      assignee: true,
      template: true,
    });

    // Custom sort: SETUP → ACTIVE → CLOSURE → ADMIN → ROUTINE → OTHER
    const typeOrder: Record<TaskType, number> = {
      [TaskType.SETUP]: 1,
      [TaskType.ACTIVE]: 2,
      [TaskType.CLOSURE]: 3,
      [TaskType.ADMIN]: 4,
      [TaskType.ROUTINE]: 5,
      [TaskType.OTHER]: 6,
    };

    return tasks.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
  }

  /**
   * Gets studio-scoped show details for task pages.
   */
  async getStudioShow(studioUid: string, showUid: string) {
    const show = await this.showService.getShowById(showUid, showDtoListInclude);

    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || show.studioId !== studio.id) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }

    return show;
  }

  /**
   * Lists shows for a studio with task completion summaries.
   */
  async getStudioShowsWithTaskSummary(studioUid: string, query: ListStudioShowsQueryTransformed) {
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    let effectiveQuery: StudioShowsQueryWithAttention = query;
    if (query.needs_attention) {
      if (query.show_uids && query.show_uids.length > 0) {
        effectiveQuery = query;
      } else {
        const alignmentDateFrom = query.date_from
          ? new Date(query.date_from)
          : this.parseLegacyPlanningDateOrThrow(query.planning_date_from, 'planning_date_from');
        const alignmentDateTo = query.date_to
          ? new Date(query.date_to)
          : this.parseLegacyPlanningDateOrThrow(query.planning_date_to, 'planning_date_to');
        const shiftAlignment = await this.shiftAlignmentService.getAlignment(studioUid, {
          dateFrom: alignmentDateFrom,
          dateTo: alignmentDateTo,
          dateFromIsDateOnly: Boolean(!query.date_from && query.planning_date_from),
          dateToIsDateOnly: Boolean(!query.date_to && query.planning_date_to),
          includeCancelled: false,
          includePast: true,
          matchShowScope: true,
        });
        const attentionShowUids = [...new Set(shiftAlignment.task_readiness_warnings.map((warning) => warning.show_id))];

        if (attentionShowUids.length === 0) {
          return { data: [], total: 0 };
        }

        effectiveQuery = {
          ...query,
          show_uids: attentionShowUids,
        };
      }
    }

    const { data: shows, total } = await this.showService.findPaginatedWithTaskSummary(
      studio.id,
      effectiveQuery,
    );

    const data = shows.map((show) => {
      // Map base show fields using shared showDto logic
      const baseShow = showDto.parse(show);
      const creators = (show.showCreators ?? []).map((showCreator) => ({
        show_creator_id: showCreator.uid,
        creator_id: showCreator.creator.uid,
        creator_name: showCreator.creator.name,
        creator_alias_name: showCreator.creator.aliasName,
        compensation_type: showCreator.compensationType,
        agreed_rate: decimalToString(showCreator.agreedRate),
        commission_rate: decimalToString(showCreator.commissionRate),
      }));
      // Lightweight per-platform summary for the all-members shows list.
      // Deliberately omits the performance metrics (gmv/ctr/cto): the list
      // never renders them and they are ADMIN/MANAGER-gated on `/performance`.
      // See `showListPlatformSummarySchema`.
      const platforms = (show.showPlatforms ?? [])
        .filter((showPlatform) => showPlatform.platform != null)
        .map((showPlatform) => ({
          id: showPlatform.platform.uid,
          name: showPlatform.platform.name,
          show_platform_uid: showPlatform.uid,
          live_stream_link: showPlatform.liveStreamLink ?? null,
          platform_show_id: showPlatform.platformShowId ?? null,
          viewer_count: showPlatform.viewerCount ?? 0,
        }));

      // prisma include type complexity
      const taskSummaries = show.taskTargets.map((tt) => tt.task);
      // A show counts as "properly assigned" when at least one task that is
      // still actionable (not CLOSED) has an assignee. Soft-deleted task
      // targets are already filtered out by `showDtoListInclude`. CLOSED
      // tasks are excluded so a show whose only assignee is on a closed
      // task still surfaces the amber warning.
      const hasProperTaskAssignment = taskSummaries.some(
        (t) => t.assigneeId !== null && t.status !== TaskStatus.CLOSED,
      );
      return {
        ...baseShow,
        creators,
        platforms,
        task_summary: {
          total: taskSummaries.length,
          assigned: taskSummaries.filter((t) => t.assigneeId !== null).length,
          unassigned: taskSummaries.filter((t) => t.assigneeId === null).length,
          completed: taskSummaries.filter((t) => t.status === TaskStatus.COMPLETED).length,
        },
        has_proper_task_assignment: hasProperTaskAssignment,
      };
    });

    return { data, total };
  }

  private parseLegacyPlanningDateOrThrow(value: string | undefined, fieldName: 'planning_date_from' | 'planning_date_to') {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw HttpError.badRequest(`${fieldName} must be a valid ISO date (YYYY-MM-DD)`);
    }

    return parsed;
  }
}
