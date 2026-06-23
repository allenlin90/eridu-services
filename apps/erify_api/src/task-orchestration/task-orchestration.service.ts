import { Injectable } from '@nestjs/common';

import type {
  BulkApproveTasksResponse,
  ListStudioShowsQueryTransformed,
} from '@eridu/api-types/task-management';

import { TaskAssignmentService } from './task-assignment.service';
import { TaskDeletionService } from './task-deletion.service';
import { TaskGenerationService } from './task-generation.service';
import type {
  SubmitTaskAuditContext,
  SubmitTaskContentMode,
  SubmitTaskContentResult,
} from './task-orchestration.types';
import { TaskRetrievalService } from './task-retrieval.service';
import { TaskSubmissionService } from './task-submission.service';

import type { UpdateTaskPayload } from '@/models/task/schemas/task.schema';
import { ShowStateGateService } from '@/show-orchestration/show-state-gate.service';

// Public types preserved for callers that imported them from this module.
export type {
  ShowGenerationResult,
  SubmitTaskAuditContext,
  SubmitTaskContentMode,
  SubmitTaskContentResult,
} from './task-orchestration.types';

/**
 * Thin coordinating facade over the task-orchestration concern services
 * (submission, generation, assignment, retrieval, deletion). Preserves the
 * public surface controllers depend on; each method delegates to the owning
 * sub-service.
 */
@Injectable()
export class TaskOrchestrationService {
  constructor(
    private readonly submission: TaskSubmissionService,
    private readonly generation: TaskGenerationService,
    private readonly assignment: TaskAssignmentService,
    private readonly retrieval: TaskRetrievalService,
    private readonly deletion: TaskDeletionService,
    private readonly showStateGateService: ShowStateGateService,
  ) {}

  submitTaskContent(
    taskUid: string,
    version: number,
    payload: UpdateTaskPayload,
    options: { mode: SubmitTaskContentMode; auditContext?: SubmitTaskAuditContext },
  ): Promise<SubmitTaskContentResult> {
    return this.submission.submitTaskContent(taskUid, version, payload, options);
  }

  bulkApproveTasks(
    studioUid: string,
    taskUids: string[],
    auditContext?: SubmitTaskAuditContext,
  ): Promise<BulkApproveTasksResponse> {
    return this.submission.bulkApproveTasks(studioUid, taskUids, auditContext);
  }

  generateTasksForShows(
    studioUid: string,
    showUids: string[],
    templateUids: string[],
    dueDates?: Record<string, string>,
  ) {
    return this.generation.generateTasksForShows(studioUid, showUids, templateUids, dueDates);
  }

  assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
    return this.assignment.assignShowsToUser(studioUid, showUids, assigneeUid);
  }

  reassignTask(
    studioUid: string,
    taskUid: string,
    assigneeUid: string | null,
    actorExtId = '',
    note?: string,
  ) {
    return this.assignment.reassignTask(studioUid, taskUid, assigneeUid, actorExtId, note);
  }

  claimTask(taskUid: string, claimant: { id: bigint; uid: string }) {
    return this.showStateGateService.claimGate(taskUid, claimant);
  }

  getShowTasks(studioUid: string, showUid: string) {
    return this.retrieval.getShowTasks(studioUid, showUid);
  }

  getStudioShow(studioUid: string, showUid: string) {
    return this.retrieval.getStudioShow(studioUid, showUid);
  }

  getStudioShowsWithTaskSummary(studioUid: string, query: ListStudioShowsQueryTransformed) {
    return this.retrieval.getStudioShowsWithTaskSummary(studioUid, query);
  }

  bulkDeleteTasks(studioUid: string, taskUids: string[]) {
    return this.deletion.bulkDeleteTasks(studioUid, taskUids);
  }
}
