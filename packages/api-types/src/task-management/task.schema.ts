import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { paginationBaseSchema, paginationQuerySchema, transformPagination } from '../pagination/index.js';
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
 * Base Task DTO schema without transform (snake_case)
 */
export const baseTaskDtoSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.nativeEnum(TASK_STATUS),
  type: z.nativeEnum(TASK_TYPE),
  due_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  content: z.record(z.string(), z.any()).nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  version: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Task DTO transformation schema
 */
export const taskDto = taskSchema.transform((obj): z.infer<typeof baseTaskDtoSchema> => ({
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

export type TaskDto = z.infer<typeof baseTaskDtoSchema>;

/**
 * Task with Relations entity schema
 */
export const taskWithRelationsSchema = taskSchema.extend({
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
      name: z.string(),
      startTime: z.date(),
      endTime: z.date(),
    }).nullable(),
  })).optional(),
});

/**
 * Base Task with Relations DTO schema
 */
export const baseTaskWithRelationsDtoSchema = baseTaskDtoSchema.extend({
  assignee: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  template: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  show: z.object({
    id: z.string(),
    name: z.string(),
    start_time: z.string(),
    end_time: z.string(),
  }).nullable().optional(),
});

/**
 * Task with Relations DTO
 */
export const taskWithRelationsDto = taskWithRelationsSchema.transform((obj): z.infer<typeof baseTaskWithRelationsDtoSchema> => {
  let show = null;
  if (obj.targets && obj.targets.length > 0) {
    const s = obj.targets[0]?.show;
    if (s) {
      show = {
        id: s.uid,
        name: s.name,
        start_time: s.startTime.toISOString(),
        end_time: s.endTime.toISOString(),
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
    assignee: obj.assignee ? { id: obj.assignee.uid, name: obj.assignee.name } : obj.assignee,
    template: obj.template ? { id: obj.template.uid, name: obj.template.name } : obj.template,
    show,
  };
});

export type TaskWithRelationsDto = z.infer<typeof baseTaskWithRelationsDtoSchema>;

/**
 * Schema for generating tasks for multiple shows
 */
export const generateTasksRequestSchema = z.object({
  show_uids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).min(1),
  template_uids: z.array(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE)).min(1),
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
  assignee_uid: z.string(),
});

export type ReassignTaskRequest = z.infer<typeof reassignTaskRequestSchema>;

/**
 * Show data with task completion summary
 */
export const showWithTaskSummaryDto = showApiResponseSchema.extend({
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
export const listStudioShowsQuerySchema = paginationQuerySchema.and(
  z.object({
    search: z.string().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    has_tasks: z.coerce.boolean().optional(),
  }),
);

export type ListStudioShowsQuery = z.input<typeof listStudioShowsQuerySchema>;
export type ListStudioShowsQueryTransformed = z.infer<typeof listStudioShowsQuerySchema>;

/**
 * Schema for updating a task's content or status
 */
export const updateTaskRequestSchema = z.object({
  version: z.number().int(),
  content: z.record(z.string(), z.any()).optional(),
  status: z.nativeEnum(TASK_STATUS).optional(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

/**
 * Query schema for listing an operator's assigned tasks
 */
export const listMyTasksQuerySchema = paginationBaseSchema
  .extend({
    status: z.union([z.nativeEnum(TASK_STATUS), z.array(z.nativeEnum(TASK_STATUS))]).optional(),
    due_date_from: z.string().datetime().optional(),
    due_date_to: z.string().datetime().optional(),
    sort: z.enum(['due_date:asc', 'due_date:desc', 'createdAt:asc', 'createdAt:desc']).optional(),
  })
  .transform(transformPagination);

export type ListMyTasksQuery = z.input<typeof listMyTasksQuerySchema>;
export type ListMyTasksQueryTransformed = z.infer<typeof listMyTasksQuerySchema>;
