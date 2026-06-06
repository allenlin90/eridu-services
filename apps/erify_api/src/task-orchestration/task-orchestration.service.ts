import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { TaskTemplate, TaskTemplateSnapshot } from '@prisma/client';
import { StudioMembership, TaskStatus, TaskType, User } from '@prisma/client';

import type { ActualsSource } from '@eridu/api-types/audits';
import { STUDIO_ROLE, type StudioRole } from '@eridu/api-types/memberships';
import type {
  BulkApproveExtractionEntry,
  BulkApproveExtractionResult,
  BulkApproveTaskResult,
  BulkApproveTasksResponse,
  ListStudioShowsQueryTransformed,
} from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';

import { TaskGenerationProcessor } from './task-generation-processor.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import {
  showDto,
  showDtoListInclude,
} from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import type { UpdateTaskPayload } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import {
  type ExtractionResult,
  FactExtractionService,
} from '@/orchestration/fact-extraction/fact-extraction.service';
import { ShiftAlignmentService } from '@/orchestration/shift-alignment/shift-alignment.service';

type MembershipWithUser = StudioMembership & { user: User };
type StudioShowsQueryWithAttention = ListStudioShowsQueryTransformed & { show_uids?: string[] };

export type ShowGenerationResult = {
  show_id: string;
  status: 'success' | 'skipped' | 'error';
  tasks_created: number;
  tasks_skipped: number;
  error?: string;
};

export type SubmitTaskContentMode = 'assignee' | 'admin';

export type SubmitTaskAuditContext = {
  actorExtId?: string;
  actorEmail?: string;
  actorRole?: StudioRole;
  source?: 'studio' | 'me' | 'admin';
};

/** Updated task as returned by the underlying `TaskService` write. */
type SubmittedTask = NonNullable<
  Awaited<ReturnType<TaskService['updateTaskContentAndStatusAsAdmin']>>
>;

/**
 * `submitTaskContent` augments the updated task with the fact-extraction
 * outcome when (and only when) it fired extraction on a fresh `COMPLETED`
 * transition. Both fields are absent on a plain status/content update.
 */
export type SubmitTaskContentResult =
  | (SubmittedTask & {
    extractionResult?: ExtractionResult;
    extractionError?: string;
  })
  | null;

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
    private readonly factExtractionService: FactExtractionService,
  ) {}

  /**
   * Canonical entry point for any caller that mutates a task's content or
   * status. Wraps the underlying `TaskService` update and, on a fresh
   * transition into `COMPLETED` for a show-targeted task, fires fact
   * extraction. Extraction errors are logged but never rethrown: the
   * submission has already been persisted by `TaskService`, and a downstream
   * extractor bug must not strand the operator.
   *
   * The two modes correspond to the two `TaskService` entry points:
   *   - `'assignee'`: enforces the submit window guards (assignee can't
   *     submit ACTIVE/CLOSURE tasks before show start time). Used by
   *     `me-task.service`.
   *   - `'admin'`: skips the submit window guards. Used by manager and
   *     system-admin paths (`studio-task.controller`, `admin-task.controller`).
   *
   * NOTE: any new path that completes a task MUST route through this
   * method, not through `TaskService.updateTaskContentAndStatus*` directly.
   * Calling `TaskService` directly silently bypasses extraction.
   */
  async submitTaskContent(
    taskUid: string,
    version: number,
    payload: UpdateTaskPayload,
    options: {
      mode: SubmitTaskContentMode;
      auditContext?: SubmitTaskAuditContext;
    },
  ): Promise<SubmitTaskContentResult> {
    // Snapshot before the update so we can detect a *transition* into
    // COMPLETED (vs. a re-save of an already-completed task) and capture
    // the show target without an extra round-trip after the write.
    const before = await this.taskService.findByUidWithSnapshot(taskUid);

    const updated = options.mode === 'assignee'
      ? await this.taskService.updateTaskContentAndStatus(taskUid, version, payload, options.auditContext)
      : await this.taskService.updateTaskContentAndStatusAsAdmin(taskUid, version, payload, options.auditContext);

    if (!updated || !before) {
      return updated;
    }

    const wasNotCompleted = before.status !== TASK_STATUS.COMPLETED;
    const isNowCompleted = updated.status === TASK_STATUS.COMPLETED;
    const targetShow = before.targets?.[0]?.show;
    if (!isNowCompleted || !targetShow) {
      return updated;
    }

    const contentChanged = payload.content !== undefined;
    const shouldExtract = wasNotCompleted || (before.status === TASK_STATUS.COMPLETED && options.mode === 'admin' && contentChanged);

    if (!shouldExtract) {
      return updated;
    }

    // Provenance for the priority resolver (see `source-priority.ts`). A
    // MANAGER write (rank 4) outranks PLATFORM (3) and OPERATOR (1) and is
    // reserved for an actual manager *override* — i.e. an admin/manager who
    // changed the content in this call. A plain approval (no content change,
    // including every bulk approval) stays OPERATOR so a later PLATFORM sync
    // can still overwrite it. `actorRole` is the studio membership role, so
    // it must be compared against the lowercase `STUDIO_ROLE` values, not
    // uppercased string literals.
    const isManagerOverride = options.mode === 'admin'
      && contentChanged
      && (options.auditContext?.actorRole === STUDIO_ROLE.ADMIN || options.auditContext?.actorRole === STUDIO_ROLE.MANAGER);
    const extractionSource: ActualsSource = isManagerOverride ? 'MANAGER' : 'OPERATOR';

    let extractionResult: ExtractionResult | undefined;
    let extractionError: string | undefined;
    try {
      extractionResult = await this.factExtractionService.extractFromTask({
        taskId: before.id,
        taskUid: before.uid,
        studioId: before.studioId,
        showId: targetShow.id,
        showUid: targetShow.uid,
        source: extractionSource,
      });
    } catch (err) {
      this.logger.error(
        `Fact extraction failed for completed task ${before.uid}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      extractionError = (err as Error).message;
    }

    if (extractionResult || extractionError) {
      return {
        ...updated,
        extractionResult,
        extractionError,
      };
    }

    return updated;
  }

  /**
   * Bulk approves multiple tasks in REVIEW status. Transitions each to COMPLETED
   * and runs the fact extraction pipeline, returning structured results per task.
   */
  async bulkApproveTasks(
    studioUid: string,
    taskUids: string[],
    auditContext?: SubmitTaskAuditContext,
  ): Promise<BulkApproveTasksResponse> {
    const results: BulkApproveTaskResult[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const taskUid of taskUids) {
      try {
        // 1. Resolve task and verify studio scope + REVIEW status
        const task = await this.taskService.findOne({
          uid: taskUid,
          studio: { uid: studioUid },
          deletedAt: null,
        });

        if (!task) {
          throw HttpError.notFound('Task', taskUid);
        }

        if (task.status !== TASK_STATUS.REVIEW) {
          throw HttpError.badRequest(`Task ${taskUid} is not in REVIEW status (current status: ${task.status})`);
        }

        // 2. Call submitTaskContent in admin mode to transition to COMPLETED.
        // Bulk approval carries no content change, so provenance stays
        // OPERATOR (see `submitTaskContent`).
        const updated = await this.submitTaskContent(
          taskUid,
          task.version,
          { status: TaskStatus.COMPLETED },
          {
            mode: 'admin',
            auditContext,
          },
        );

        totalSuccess++;

        // 3. Map extraction outcomes onto the wire contract.
        const extractionResult = updated?.extractionResult;
        const extractionError = updated?.extractionError;
        const entries: BulkApproveExtractionEntry[] = (extractionResult?.entries ?? []).map((entry) => ({
          fact_key: entry.factKey,
          source_field_id: entry.sourceFieldId,
          target_uid: entry.targetUid,
          outcome: entry.outcome,
          audit_uid: entry.auditUid,
          reason: entry.reason,
        }));

        const hasExtractorError = (extractionResult?.entries ?? []).some(
          (entry) => entry.outcome === 'noop' && entry.reason === 'extractor_error',
        );

        const extractionStatus: BulkApproveExtractionResult['status'] = extractionError
          ? 'error'
          : extractionResult
            ? (hasExtractorError ? 'error' : 'success')
            : 'skipped';

        results.push({
          task_uid: taskUid,
          status: 'success',
          extraction: {
            status: extractionStatus,
            error: extractionError,
            entries,
          },
        });
      } catch (error: unknown) {
        totalFailed++;
        results.push({
          task_uid: taskUid,
          status: 'error',
          error: extractHttpErrorMessage(error),
        });
      }
    }

    return {
      results,
      summary: {
        total_processed: taskUids.length,
        total_success: totalSuccess,
        total_failed: totalFailed,
      },
    };
  }

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
          show_id: show.uid,
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
  ): Promise<MembershipWithUser> {
    const { data: memberships } = await this.studioMembershipService.listStudioMemberships(
      { studioId: studioUid },
      { user: true },
    );
    const membership = (memberships as MembershipWithUser[]).find(
      (m) => m.user?.uid === assigneeUid,
    );
    if (!membership) {
      throw HttpError.badRequest(`User ${assigneeUid} is not a member of studio ${studioUid}`);
    }
    return membership;
  }

  /**
   * Assigns all tasks of selected shows to a specific user.
   */
  async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
    // 1. Validate assignee is a studio member
    const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);

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
      const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);
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
      const platforms = (show.showPlatforms ?? [])
        .filter((showPlatform) => showPlatform.platform != null)
        .map((showPlatform) => ({
          id: showPlatform.platform.uid,
          name: showPlatform.platform.name,
          show_platform_uid: showPlatform.uid,
          live_stream_link: showPlatform.liveStreamLink ?? null,
          platform_show_id: showPlatform.platformShowId ?? null,
          viewer_count: showPlatform.viewerCount ?? 0,
          gmv: decimalToString(showPlatform.gmv),
          ctr: decimalToString(showPlatform.ctr),
          cto: decimalToString(showPlatform.cto),
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

/**
 * Extracts a human-readable, string-typed message from an unknown error for
 * the bulk-approval per-task `error` field (`z.string().optional()`).
 * `HttpException` bodies can carry a `message` that is a string or a
 * `string[]` (class-validator); the array is joined so the response always
 * satisfies the wire contract.
 */
function extractHttpErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join(', ');
      }
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}
