import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { paginationBaseSchema, transformPagination } from '../pagination/index.js';
import { showApiResponseSchema } from '../shows/index.js';

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
      showMCs: z.array(z.object({
        mc: z.object({
          name: z.string(),
          aliasName: z.string(),
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
  if (obj.targets && obj.targets.length > 0) {
    const s = obj.targets[0]?.show;
    if (s) {
      show = {
        id: s.uid,
        external_id: s.externalId ?? s.uid,
        name: s.name,
        start_time: s.startTime.toISOString(),
        end_time: s.endTime.toISOString(),
        client_name: s.client?.name ?? null,
        studio_room_name: s.studioRoom?.name ?? null,
        mc_names: (s.showMCs ?? []).map((item) => item.mc.aliasName || item.mc.name),
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
  };
});

export type TaskWithRelationsDto = z.infer<typeof taskWithRelationsDto>;

/**
 * Schema for generating tasks for multiple shows
 */
export const generateTasksRequestSchema = z.object({
  show_uids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).min(1),
  template_uids: z.array(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE)).min(1),
  due_dates: z.record(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE), z.string().datetime()).optional(),
});

export type GenerateTasksRequest = z.infer<typeof generateTasksRequestSchema>;

/**
 * Result of task generation for a single show
 */
export const generateTasksResultSchema = z.object({
  show_uid: z.string(),
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
  show_uids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).min(1),
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
  show_uid: z.string().startsWith(UID_PREFIXES.SHOW),
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
export const showWithTaskSummaryDto = showApiResponseSchema.extend({
  mcs: z.array(z.object({
    mc_id: z.string(),
    mc_name: z.string(),
    mc_aliasname: z.string(),
  })).default([]),
  task_summary: z.object({
    total: z.number().int(),
    assigned: z.number().int(),
    unassigned: z.number().int(),
    completed: z.number().int(),
  }),
});

export type ShowWithTaskSummaryDto = z.infer<typeof showWithTaskSummaryDto>;

/**
 * Query schema for listing studio shows with task filters
 */
export const listStudioShowsQuerySchema = paginationBaseSchema
  .extend({
    search: z.string().optional(),
    client_name: z.string().optional(),
    show_type_name: z.string().optional(),
    show_standard_name: z.string().optional(),
    show_status_name: z.string().optional(),
    platform_name: z.string().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    has_tasks: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
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
  due_date: z.string().datetime().nullable().optional(),
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
    due_date_from: z.string().datetime().optional(),
    due_date_to: z.string().datetime().optional(),
    show_start_from: z.string().datetime().optional(),
    show_start_to: z.string().datetime().optional(),
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
  })
  .transform(transformPagination);

export type ListMyTasksQuery = z.input<typeof listMyTasksQuerySchema>;
export type ListMyTasksQueryTransformed = z.infer<typeof listMyTasksQuerySchema>;
