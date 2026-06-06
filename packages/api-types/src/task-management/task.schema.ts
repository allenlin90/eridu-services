import { z } from 'zod';

import { clientApiResponseSchema } from '../clients/index.js';
import { UID_PREFIXES } from '../constants.js';
import { CREATOR_COMPENSATION_TYPE } from '../creators/schemas.js';
import { paginationBaseSchema, transformPagination } from '../pagination/index.js';
import { platformApiResponseSchema } from '../platforms/index.js';
import { scheduleApiResponseSchema } from '../schedules/index.js';
import { showStandardApiResponseSchema } from '../show-standards/index.js';
import { showStatusApiResponseSchema } from '../show-statuses/index.js';
import { showTypeApiResponseSchema } from '../show-types/index.js';
import { showApiResponseSchema, showListPlatformSummarySchema } from '../shows/index.js';
import { studioRoomApiResponseSchema } from '../studio-rooms/index.js';

/**
 * Task Status enum
 */
export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  COMPLETED: 'COMPLETED',
  BLOCKED: 'BLOCKED',
  CLOSED: 'CLOSED',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/**
 * Task Type enum
 */
export const TASK_TYPE = {
  SETUP: 'SETUP',
  ACTIVE: 'ACTIVE',
  CLOSURE: 'CLOSURE',
  ADMIN: 'ADMIN',
  ROUTINE: 'ROUTINE',
  OTHER: 'OTHER',
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

/**
 * Task Action enum (action-based workflow API)
 */
export const TASK_ACTION = {
  SAVE_CONTENT: 'SAVE_CONTENT',
  START_WORK: 'START_WORK',
  SUBMIT_FOR_REVIEW: 'SUBMIT_FOR_REVIEW',
  CONTINUE_EDITING: 'CONTINUE_EDITING',
  MARK_BLOCKED: 'MARK_BLOCKED',
  APPROVE_COMPLETED: 'APPROVE_COMPLETED',
  CLOSE_TASK: 'CLOSE_TASK',
  REOPEN_TASK: 'REOPEN_TASK',
} as const;

export type TaskAction = (typeof TASK_ACTION)[keyof typeof TASK_ACTION];

/**
 * Task entity schema
 */
export const taskSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UID_PREFIXES.TASK),
  studioId: z.bigint(),
  templateId: z.bigint().nullable(),
  snapshotId: z.bigint(),
  assigneeId: z.bigint().nullable(),
  description: z.string(),
  status: z.nativeEnum(TASK_STATUS),
  type: z.nativeEnum(TASK_TYPE),
  dueDate: z.date().nullable(),
  completedAt: z.date().nullable(),
  content: z.record(z.string(), z.any()).nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  version: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Task = z.infer<typeof taskSchema>;

/**
 * Task DTO transformation schema
 */
export const taskDto = taskSchema.transform((obj) => ({
  id: obj.uid,
  description: obj.description,
  status: obj.status,
  type: obj.type,
  due_date: obj.dueDate?.toISOString() ?? null,
  completed_at: obj.completedAt?.toISOString() ?? null,
  content: obj.content,
  metadata: obj.metadata,
  version: obj.version,
  created_at: obj.createdAt.toISOString(),
  updated_at: obj.updatedAt.toISOString(),
}));

export type TaskDto = z.infer<typeof taskDto>;

/**
 * Task with Relations entity schema
 */
export const taskWithRelationsSchema = taskSchema.extend({
  snapshot: z.object({
    schema: z.unknown(),
    version: z.number().int(),
  }).nullable().optional(),
  assignee: z.object({
    uid: z.string(),
    name: z.string(),
  }).nullable().optional(),
  template: z.object({
    uid: z.string(),
    name: z.string(),
    // Denormalized current template version. The task's frozen snapshot
    // version is compared against this to detect binding drift.
    version: z.number().int().optional(),
  }).nullable().optional(),
  targets: z.array(z.object({
    show: z.object({
      uid: z.string(),
      externalId: z.string().nullable().optional(),
      name: z.string(),
      startTime: z.date(),
      endTime: z.date(),
      client: z.object({
        name: z.string(),
      }).nullable().optional(),
      studioRoom: z.object({
        name: z.string(),
      }).nullable().optional(),
      showCreators: z.array(z.object({
        uid: z.string(),
        creator: z.object({
          name: z.string(),
          aliasName: z.string(),
        }),
      })).optional(),
      showPlatforms: z.array(z.object({
        uid: z.string(),
        platform: z.object({
          name: z.string(),
        }),
      })).optional(),
    }).nullable(),
  })).optional(),
});

/**
 * Task with Relations DTO
 */
export const taskWithRelationsDto = taskWithRelationsSchema.transform((obj) => {
  let show = null;
  let hydrationContext: {
    creators: { uid: string; label: string }[];
    platforms: { uid: string; label: string }[];
  } = { creators: [], platforms: [] };
  if (obj.targets && obj.targets.length > 0) {
    const s = obj.targets[0]?.show;
    if (s) {
      const creatorEntries = (s.showCreators ?? []).map((item) => ({
        uid: item.uid,
        label: item.creator.aliasName || item.creator.name,
      }));
      const platformEntries = (s.showPlatforms ?? []).map((item) => ({
        uid: item.uid,
        label: item.platform.name,
      }));
      show = {
        id: s.uid,
        external_id: s.externalId ?? s.uid,
        name: s.name,
        start_time: s.startTime.toISOString(),
        end_time: s.endTime.toISOString(),
        client_name: s.client?.name ?? null,
        studio_room_name: s.studioRoom?.name ?? null,
        creator_names: creatorEntries.map((c) => c.label),
      };
      hydrationContext = {
        creators: creatorEntries,
        platforms: platformEntries,
      };
    }
  }

  return {
    id: obj.uid,
    description: obj.description,
    status: obj.status,
    type: obj.type,
    due_date: obj.dueDate?.toISOString() ?? null,
    completed_at: obj.completedAt?.toISOString() ?? null,
    content: obj.content,
    metadata: obj.metadata,
    version: obj.version,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
    snapshot: obj.snapshot
      ? {
          schema: obj.snapshot.schema,
          version: obj.snapshot.version,
        }
      : null,
    assignee: obj.assignee ? { id: obj.assignee.uid, name: obj.assignee.name } : null,
    template: obj.template ? { id: obj.template.uid, name: obj.template.name } : null,
    show,
    hydration_context: hydrationContext,
    // Binding drift: the task's frozen snapshot is older than the template's
    // current version. `TaskTemplate.version` is bumped in lockstep with each
    // new snapshot, so a version comparison is an exact, query-free drift
    // signal that resolves identically for list and detail responses.
    has_binding_drift:
      obj.snapshot != null
      && obj.template?.version != null
      && obj.snapshot.version < obj.template.version,
  };
});

export type TaskWithRelationsDto = z.infer<typeof taskWithRelationsDto>;

/**
 * Schema for generating tasks for multiple shows
 */
export const generateTasksRequestSchema = z.object({
  show_ids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).min(1),
  template_uids: z.array(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE)).min(1),
  due_dates: z.record(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE), z.iso.datetime()).optional(),
});

export type GenerateTasksRequest = z.infer<typeof generateTasksRequestSchema>;

/**
 * Result of task generation for a single show
 */
export const generateTasksResultSchema = z.object({
  show_id: z.string(),
  status: z.enum(['success', 'error', 'skipped']),
  tasks_created: z.number().int(),
  tasks_skipped: z.number().int(),
  error: z.string().optional(),
});

export type GenerateTasksResult = z.infer<typeof generateTasksResultSchema>;

/**
 * Response schema for bulk task generation
 */
export const generateTasksResponseSchema = z.object({
  results: z.array(generateTasksResultSchema),
  summary: z.object({
    shows_processed: z.number().int(),
    total_tasks_created: z.number().int(),
    total_skipped: z.number().int(),
  }),
});

export type GenerateTasksResponse = z.infer<typeof generateTasksResponseSchema>;

/**
 * Schema for assigning shows to a user
 */
export const assignShowsRequestSchema = z.object({
  show_ids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).min(1),
  assignee_uid: z.string(),
});

export type AssignShowsRequest = z.infer<typeof assignShowsRequestSchema>;

/**
 * Response schema for assigning shows
 */
export const assignShowsResponseSchema = z.object({
  updated_count: z.number().int(),
  shows: z.array(z.string()),
  show_count: z.number().int(),
  shows_with_tasks_count: z.number().int(),
  shows_without_tasks: z.array(z.string()),
  assignee: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type AssignShowsResponse = z.infer<typeof assignShowsResponseSchema>;

/**
 * Schema for reassigning a single task
 */
export const reassignTaskRequestSchema = z.object({
  assignee_uid: z.string().nullable(),
});

export type ReassignTaskRequest = z.infer<typeof reassignTaskRequestSchema>;

/**
 * Schema for reassigning a task to another show
 */
export const reassignTaskShowRequestSchema = z.object({
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
});

export type ReassignTaskShowRequest = z.infer<typeof reassignTaskShowRequestSchema>;

/**
 * Schema for bulk task deletion
 */
export const bulkDeleteTasksRequestSchema = z.object({
  task_uids: z.array(z.string().startsWith(UID_PREFIXES.TASK)).min(1),
});

export type BulkDeleteTasksRequest = z.infer<typeof bulkDeleteTasksRequestSchema>;

/**
 * Response schema for bulk task deletion
 */
export const bulkDeleteTasksResponseSchema = z.object({
  deleted_count: z.number().int(),
});

export type BulkDeleteTasksResponse = z.infer<typeof bulkDeleteTasksResponseSchema>;

/**
 * Show data with task completion summary
 */
const showSummaryCreatorSchema = z.object({
  show_creator_id: z.string(),
  creator_id: z.string(),
  creator_name: z.string(),
  creator_alias_name: z.string(),
  compensation_type: z.enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]]).nullable(),
  agreed_rate: z.string().nullable(),
  commission_rate: z.string().nullable(),
});

export const showWithTaskSummaryDto = showApiResponseSchema
  .extend({
    creators: z.array(showSummaryCreatorSchema).default([]),
    platforms: z.array(showListPlatformSummarySchema).default([]),
    task_summary: z.object({
      total: z.number().int(),
      assigned: z.number().int(),
      unassigned: z.number().int(),
      completed: z.number().int(),
    }),
    /**
     * True when the show has at least one active task (not soft-deleted, not
     * CLOSED) that is assigned to a user. Drives the PR 12.0.5 amber
     * "No Task Assigned" warning badge on `/show-operations`: missing here
     * means no operator is on the hook for actuals on this show, even if a
     * template task exists. See PRD §⚠️ Show-Operations Task Assignment
     * Alignment.
     */
    has_proper_task_assignment: z.boolean(),
  });

export type ShowWithTaskSummaryDto = z.infer<typeof showWithTaskSummaryDto>;

/**
 * Studio show lookup bundle for filter dropdown options.
 */
export const studioShowLookupsDto = z.object({
  clients: z.array(clientApiResponseSchema),
  show_types: z.array(showTypeApiResponseSchema),
  show_standards: z.array(showStandardApiResponseSchema),
  show_statuses: z.array(showStatusApiResponseSchema),
  platforms: z.array(platformApiResponseSchema),
  // Schedule search moved to the dedicated `/studios/:studioId/schedules` endpoint to
  // keep the shared lookup bootstrap lightweight for unrelated show-management surfaces.
  schedules: z.array(scheduleApiResponseSchema).default([]),
  studio_rooms: z.array(studioRoomApiResponseSchema),
});

export type StudioShowLookupsDto = z.infer<typeof studioShowLookupsDto>;

/**
 * Query schema for listing studio shows with task filters
 */
export const listStudioShowsQuerySchema = paginationBaseSchema
  .extend({
    search: z.string().optional(),
    schedule_name: z.string().optional(),
    creator_name: z.string().optional(),
    client_id: z.string().optional(),
    client_name: z.string().optional(),
    show_type_name: z.string().optional(),
    show_standard_name: z.string().optional(),
    show_status_name: z.string().optional(),
    platform_name: z.string().optional(),
    date_from: z.iso.datetime().optional(),
    date_to: z.iso.datetime().optional(),
    planning_date_from: z.iso.date().optional(),
    planning_date_to: z.iso.date().optional(),
    actuals_state: z.enum(['missing', 'complete']).optional(),
    has_tasks: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    has_creators: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    needs_attention: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    has_schedule: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    show_uids: z
      .union([z.string(), z.array(z.string())])
      .transform((value) => (Array.isArray(value) ? value : [value]))
      .optional(),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .transform(transformPagination);

export type ListStudioShowsQuery = z.input<typeof listStudioShowsQuerySchema>;
export type ListStudioShowsQueryTransformed = z.infer<typeof listStudioShowsQuerySchema>;

/**
 * Schema for updating a task's content or status
 */
export const updateTaskRequestSchema = z.object({
  version: z.number().int(),
  content: z.record(z.string(), z.any()).optional(),
  status: z.nativeEnum(TASK_STATUS).optional(),
  due_date: z.iso.datetime().nullable().optional(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

/**
 * Action-based task update request schema
 */
export const taskActionRequestSchema = z.object({
  version: z.number().int(),
  action: z.nativeEnum(TASK_ACTION),
  content: z.record(z.string(), z.any()).optional(),
  note: z.string().trim().min(1).optional(),
});

export type TaskActionRequest = z.infer<typeof taskActionRequestSchema>;

/**
 * Query schema for listing an operator's assigned tasks
 */
export const listMyTasksQuerySchema = paginationBaseSchema
  .extend({
    status: z.union([z.nativeEnum(TASK_STATUS), z.array(z.nativeEnum(TASK_STATUS))]).optional(),
    task_type: z.union([z.nativeEnum(TASK_TYPE), z.array(z.nativeEnum(TASK_TYPE))]).optional(),
    has_assignee: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    has_due_date: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    due_date_from: z.iso.datetime().optional(),
    due_date_to: z.iso.datetime().optional(),
    show_start_from: z.iso.datetime().optional(),
    show_start_to: z.iso.datetime().optional(),
    studio_name: z.string().trim().min(1).optional(),
    client_name: z.string().trim().min(1).optional(),
    assignee_name: z.string().trim().min(1).optional(),
    show_name: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
    reference_id: z.string().trim().min(1).optional(),
    sort: z
      .enum([
        'due_date:asc',
        'due_date:desc',
        'updated_at:asc',
        'updated_at:desc',
        // Backward compatibility for older clients
        'createdAt:asc',
        'createdAt:desc',
      ])
      .optional(),
    studio_id: z.string().optional(),
    client_id: z.string().optional(),
    review_tab: z
      .enum([
        'all',
        'ready',
        'attention',
        'done',
        'pre-prod-attention',
        'pre-prod-ready',
        'pre-prod-done',
        'on-air-attention',
        'on-air-ready',
        'on-air-done',
        'post-prod-attention',
        'post-prod-ready',
        'post-prod-done',
      ])
      .optional(),
  })
  .transform(transformPagination);

export type ListMyTasksQuery = z.input<typeof listMyTasksQuerySchema>;
export type ListMyTasksQueryTransformed = z.infer<typeof listMyTasksQuerySchema>;

/**
 * Schema for bulk task approval request
 */
export const bulkApproveTasksRequestSchema = z.object({
  task_uids: z.array(z.string().startsWith(UID_PREFIXES.TASK)).min(1),
});

export type BulkApproveTasksRequest = z.infer<typeof bulkApproveTasksRequestSchema>;

/**
 * Schema for single task extraction result entry
 */
export const bulkApproveExtractionEntrySchema = z.object({
  fact_key: z.string(),
  source_field_id: z.string(),
  target_uid: z.string(),
  outcome: z.string(),
  audit_uid: z.string().optional(),
  reason: z.string().optional(),
});

export type BulkApproveExtractionEntry = z.infer<typeof bulkApproveExtractionEntrySchema>;

/**
 * Schema for single task extraction result
 */
export const bulkApproveExtractionResultSchema = z.object({
  status: z.enum(['success', 'error', 'skipped']),
  error: z.string().optional(),
  entries: z.array(bulkApproveExtractionEntrySchema),
});

export type BulkApproveExtractionResult = z.infer<typeof bulkApproveExtractionResultSchema>;

/**
 * Schema for individual task bulk approval result
 */
export const bulkApproveTaskResultSchema = z.object({
  task_uid: z.string(),
  status: z.enum(['success', 'error']),
  error: z.string().optional(),
  extraction: bulkApproveExtractionResultSchema.optional(),
});

export type BulkApproveTaskResult = z.infer<typeof bulkApproveTaskResultSchema>;

/**
 * Response schema for bulk task approval
 */
export const bulkApproveTasksResponseSchema = z.object({
  results: z.array(bulkApproveTaskResultSchema),
  summary: z.object({
    total_processed: z.number().int(),
    total_success: z.number().int(),
    total_failed: z.number().int(),
  }),
});

export type BulkApproveTasksResponse = z.infer<typeof bulkApproveTasksResponseSchema>;

/**
 * Schema for Task Review Queue tab statistics
 */
export const taskReviewStatsSchema = z.object({
  total: z.number().int(),
  ready: z.number().int(),
  attention: z.number().int(),
  done: z.number().int(),
  preProdAttentionCount: z.number().int(),
  preProdReadyCount: z.number().int(),
  preProdDoneCount: z.number().int(),
  onAirAttentionCount: z.number().int(),
  onAirReadyCount: z.number().int(),
  onAirDoneCount: z.number().int(),
  postProdAttentionCount: z.number().int(),
  postProdReadyCount: z.number().int(),
  postProdDoneCount: z.number().int(),
});

export type TaskReviewStats = z.infer<typeof taskReviewStatsSchema>;
