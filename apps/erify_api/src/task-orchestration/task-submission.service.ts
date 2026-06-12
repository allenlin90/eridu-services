import { HttpException, Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

import type { ActualsSource } from '@eridu/api-types/audits';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import type {
  BulkApproveExtractionEntry,
  BulkApproveExtractionResult,
  BulkApproveTaskResult,
  BulkApproveTasksResponse,
} from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';

import type {
  SubmitTaskAuditContext,
  SubmitTaskContentMode,
  SubmitTaskContentResult,
} from './task-orchestration.types';

import { HttpError } from '@/lib/errors/http-error.util';
import type { UpdateTaskPayload } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import {
  type ExtractionResult,
  FactExtractionService,
} from '@/orchestration/fact-extraction/fact-extraction.service';

/**
 * Task submission + bulk approval. Owns the canonical content/status write path
 * and the fact-extraction trigger on a fresh COMPLETED transition.
 */
@Injectable()
export class TaskSubmissionService {
  private readonly logger = new Logger(TaskSubmissionService.name);

  constructor(
    private readonly taskService: TaskService,
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
   *
   * The tasks are resolved in a single bulk read; the per-task submission stays
   * sequential because each runs its own fact extraction with side effects on
   * the shared show rows.
   */
  async bulkApproveTasks(
    studioUid: string,
    taskUids: string[],
    auditContext?: SubmitTaskAuditContext,
  ): Promise<BulkApproveTasksResponse> {
    const results: BulkApproveTaskResult[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    // Resolve + studio-scope all tasks in one query instead of one findOne
    // per uid; the per-task validation + submission below still runs in order.
    const tasks = await this.taskService.findMany({
      where: { uid: { in: taskUids }, studio: { uid: studioUid } },
    });
    const taskByUid = new Map(tasks.map((task) => [task.uid, task]));

    for (const taskUid of taskUids) {
      try {
        // 1. Verify task exists (studio-scoped) + REVIEW status
        const task = taskByUid.get(taskUid);

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
