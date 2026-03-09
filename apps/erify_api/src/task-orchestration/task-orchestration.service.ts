import { Injectable, Logger } from '@nestjs/common';
import type { TaskTemplate, TaskTemplateSnapshot } from '@prisma/client';
import { StudioMembership, TaskStatus, TaskType, User } from '@prisma/client';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import type { ListStudioShowsQueryTransformed } from '@eridu/api-types/task-management';

import { TaskGenerationProcessor } from './task-generation-processor.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { isStudioMembershipTaskHelper } from '@/models/membership/studio-membership-helper.util';
import { showDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { ShiftAlignmentService } from '@/orchestration/shift-alignment/shift-alignment.service';

type MembershipWithUser = StudioMembership & { user: User };
type StudioShowsQueryWithAttention = ListStudioShowsQueryTransformed & { show_uids?: string[] };

export type ShowGenerationResult = {
  show_uid: string;
  status: 'success' | 'skipped' | 'error';
  tasks_created: number;
  tasks_skipped: number;
  error?: string;
};

@Injectable()
export class TaskOrchestrationService {
  private readonly logger = new Logger(TaskOrchestrationService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly taskTemplateService: TaskTemplateService,
    private readonly showService: ShowService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly taskGenerationProcessor: TaskGenerationProcessor,
    private readonly studioService: StudioService,
    private readonly taskTargetService: TaskTargetService,
    private readonly shiftAlignmentService: ShiftAlignmentService,
  ) {}

  /**
   * Generates tasks for multiple shows based on a set of templates.
   * Idempotent per show-template pair.
   */
  async generateTasksForShows(
    studioUid: string,
    showUids: string[],
    templateUids: string[],
    dueDates?: Record<string, string>,
  ) {
    // 1. Resolve studio and validate templates
    const templates = await this.taskTemplateService.findAll({
      where: {
        uid: { in: templateUids },
        studio: { uid: studioUid },
        isActive: true,
      },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    }) as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

    if (templates.length === 0) {
      throw HttpError.badRequest('No valid active templates found for the provided UIDs');
    }

    // 2. Resolve shows and validate they belong to the studio
    const shows = await this.showService.findMany({
      where: {
        uid: { in: showUids },
        studio: { uid: studioUid },
        deletedAt: null,
      },
    });

    if (shows.length === 0) {
      throw HttpError.badRequest('No valid shows found for the provided UIDs');
    }

    const results: ShowGenerationResult[] = [];
    let totalTasksCreated = 0;
    let totalSkipped = 0;

    // 3. Process shows
    for (const show of shows) {
      try {
        const showResult = await this.taskGenerationProcessor.processShow(show, templates, dueDates);
        results.push(showResult);

        if (showResult.status === 'success' || showResult.status === 'skipped') {
          totalTasksCreated += showResult.tasks_created;
          totalSkipped += showResult.tasks_skipped;
        }
      } catch (error) {
        this.logger.error(`Failed to generate tasks for show ${show.uid}`, error);
        results.push({
          show_uid: show.uid,
          status: 'error',
          tasks_created: 0,
          tasks_skipped: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      results,
      summary: {
        shows_processed: shows.length,
        total_tasks_created: totalTasksCreated,
        total_skipped: totalSkipped,
      },
    };
  }

  /**
   * Resolves a studio member by user UID, throwing if not found.
   */
  private async resolveStudioMember(
    studioUid: string,
    assigneeUid: string,
    options?: { requireTaskHelper?: boolean },
  ): Promise<MembershipWithUser> {
    const membership = await this.studioMembershipService.findOne(
      {
        studio: { uid: studioUid },
        user: { uid: assigneeUid },
        deletedAt: null,
      },
      { user: true },
    ) as MembershipWithUser | null;
    if (!membership) {
      throw HttpError.badRequest(`User ${assigneeUid} is not a member of studio ${studioUid}`);
    }
    const requireTaskHelper = options?.requireTaskHelper ?? false;
    if (requireTaskHelper) {
      const isPrivilegedRole = membership.role === STUDIO_ROLE.ADMIN || membership.role === STUDIO_ROLE.MANAGER;
      const isTaskHelper = isStudioMembershipTaskHelper(membership.metadata as Record<string, unknown>);
      if (!isPrivilegedRole && !isTaskHelper) {
        throw HttpError.badRequest(
          `User ${assigneeUid} is not marked as task-helper in studio ${studioUid}`,
        );
      }
    }
    return membership;
  }

  /**
   * Assigns all tasks of selected shows to a specific user.
   */
  async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
    // 1. Validate assignee is a studio member
    const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid, {
      requireTaskHelper: true,
    });

    // 2. Resolve shows
    const shows = await this.showService.findMany({
      where: {
        uid: { in: showUids },
        studio: { uid: studioUid },
        deletedAt: null,
      },
    });

    if (shows.length === 0) {
      throw HttpError.badRequest('No valid shows found');
    }

    const showIds = shows.map((s) => s.id);

    // 3. Find task-target links for these shows (explicitly captures shows with/without generated tasks)
    const taskTargets = await this.taskTargetService.findByShowIds(showIds);
    const taskIds = [...new Set(taskTargets.map((t) => t.taskId))];
    const showsWithTasks = new Set(taskTargets.map((tt) => tt.showId).filter((id): id is bigint => id !== null));
    const showsWithoutTasks = shows
      .filter((show) => !showsWithTasks.has(show.id))
      .map((show) => show.uid);

    if (taskIds.length === 0) {
      return {
        updated_count: 0,
        shows: shows.map((s) => s.uid),
        show_count: shows.length,
        shows_with_tasks_count: 0,
        shows_without_tasks: showsWithoutTasks,
        assignee: {
          id: assigneeMembership.user.uid,
          name: assigneeMembership.user.name,
        },
      };
    }

    // 4. Bulk update assignee
    const result = await this.taskService.updateAssigneeByTaskIds(taskIds, assigneeMembership.userId);

    return {
      updated_count: result.count,
      shows: shows.map((s) => s.uid),
      show_count: shows.length,
      shows_with_tasks_count: shows.length - showsWithoutTasks.length,
      shows_without_tasks: showsWithoutTasks,
      assignee: {
        id: assigneeMembership.user.uid,
        name: assigneeMembership.user.name,
      },
    };
  }

  /**
   * Reassigns a single task to a user or unassigns it.
   */
  async reassignTask(studioUid: string, taskUid: string, assigneeUid: string | null) {
    const task = await this.taskService.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    // Verify studio scope
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || task.studioId !== studio.id) {
      throw HttpError.forbidden('Task does not belong to this studio');
    }

    let assigneeUserId: bigint | null = null;

    if (assigneeUid) {
      const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid, {
        requireTaskHelper: true,
      });
      assigneeUserId = assigneeMembership.userId;
    }

    return this.taskService.setAssignee(taskUid, assigneeUserId, { assignee: true, template: true });
  }

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
    const show = await this.showService.getShowById(showUid, {
      client: true,
      studio: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
    });

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

    const { data: shows, total } = await this.showService.findPaginatedWithTaskSummary(
      studio.id,
      effectiveQuery,
    );

    const data = shows.map((show) => {
      // Map base show fields using shared showDto logic
      const baseShow = showDto.parse(show);

      // prisma include type complexity
      const taskSummaries = show.taskTargets.map((tt) => tt.task);
      return {
        ...baseShow,
        mcs: (show.showMCs ?? []).map((showMC) => ({
          mc_id: showMC.mc.uid,
          mc_name: showMC.mc.name,
          mc_aliasname: showMC.mc.aliasName,
        })),
        task_summary: {
          total: taskSummaries.length,
          assigned: taskSummaries.filter((t) => t.assigneeId !== null).length,
          unassigned: taskSummaries.filter((t) => t.assigneeId === null).length,
          completed: taskSummaries.filter((t) => t.status === TaskStatus.COMPLETED).length,
        },
      };
    });

    return { data, total };
  }

  /**
   * Soft-deletes multiple tasks (must belong to the studio).
   */
  async bulkDeleteTasks(studioUid: string, taskUids: string[]) {
    // 1. Resolve studio
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    // 2. Perform bulk soft delete
    const result = await this.taskService.bulkSoftDelete(studio.id, taskUids);

    if (result.count === 0) {
      throw HttpError.notFound('Tasks', taskUids.join(', '));
    }

    return {
      deleted_count: result.count,
    };
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
