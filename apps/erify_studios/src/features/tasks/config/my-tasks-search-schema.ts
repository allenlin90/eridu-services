import { z } from 'zod';

import { TASK_STATUS, TASK_TYPE } from '@eridu/api-types/task-management';

export const DEFAULT_STATUS_FILTERS = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.REVIEW,
] as const;

export const DEFAULT_LIMIT = 20 as const;
export const DEFAULT_SORT = 'due_date:asc' as const;

const statusFilterSchema = z
  .union([z.nativeEnum(TASK_STATUS), z.array(z.nativeEnum(TASK_STATUS))])
  .optional()
  .transform((value) => {
    if (!value) {
      return [...DEFAULT_STATUS_FILTERS];
    }
    return Array.isArray(value) ? value : [value];
  });

const taskTypeFilterSchema = z
  .union([z.nativeEnum(TASK_TYPE), z.array(z.nativeEnum(TASK_TYPE))])
  .optional()
  .transform((value) => {
    if (!value) {
      return [] as Array<(typeof TASK_TYPE)[keyof typeof TASK_TYPE]>;
    }
    return Array.isArray(value) ? value : [value];
  });

export const myTasksSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.union([z.literal(20), z.literal(50), z.literal(100)]).catch(DEFAULT_LIMIT),
  show_start_date: z.string().optional().catch(undefined),
  overdue_only: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => (typeof value === 'string' ? value === 'true' : value))
    .optional()
    .catch(false),
  status: statusFilterSchema.catch([...DEFAULT_STATUS_FILTERS]),
  task_type: taskTypeFilterSchema.catch([]),
  search: z.string().optional().catch(undefined),
  sort: z.enum(['due_date:asc', 'due_date:desc', 'updated_at:desc']).catch(DEFAULT_SORT),
  view_mode: z.enum(['task', 'show']).catch('task'),
});

export type MyTasksSearch = z.infer<typeof myTasksSearchSchema>;
