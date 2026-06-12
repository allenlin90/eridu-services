import type { StudioMembership, User } from '@prisma/client';

import type { StudioRole } from '@eridu/api-types/memberships';
import type { ListStudioShowsQueryTransformed } from '@eridu/api-types/task-management';

import type { TaskService } from '@/models/task/task.service';
import type { ExtractionResult } from '@/orchestration/fact-extraction/fact-extraction.service';

export type MembershipWithUser = StudioMembership & { user: User };

export type StudioShowsQueryWithAttention = ListStudioShowsQueryTransformed & {
  show_uids?: string[];
};

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
export type SubmittedTask = NonNullable<
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
