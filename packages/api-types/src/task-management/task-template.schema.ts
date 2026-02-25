import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import {
  paginationBaseSchema,
  paginationQuerySchema,
  transformPagination,
} from '../pagination/index.js';

import { TASK_STATUS, TASK_TYPE } from './task.schema.js';

/**
 * Task Template entity schema
 * Represents a template for creating tasks within a studio
 */
export const taskTemplateSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE),
  studioId: z.bigint(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  currentSchema: z.record(z.string(), z.any()),
  version: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

/**
 * Task Template entity type
 * @example
 * const template: TaskTemplate = {
 *   id: 1n,
 *   uid: 'ttpl_abc123',
 *   name: 'Production Checklist',
 *   studioId: 1n,
 *   description: 'Standard production tasks',
 *   isActive: true,
 *   currentSchema: { items: [] },
 *   version: 1,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   deletedAt: null,
 * };
 */
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;

/**
 * Schema for creating a new task template
 */
export const createTaskTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  task_type: z.nativeEnum(TASK_TYPE),
  schema: z.record(z.string(), z.any()),
});

/**
 * Input type for creating a task template
 */
export type CreateTaskTemplateInput = z.infer<typeof createTaskTemplateSchema>;

/**
 * Task Template DTO transformation schema
 * Transforms internal representation to API response format
 */
export const taskTemplateDto = taskTemplateSchema.transform((obj) => ({
  id: obj.uid,
  name: obj.name,
  description: obj.description,
  task_type: (obj.currentSchema as { metadata?: { task_type?: keyof typeof TASK_TYPE } })?.metadata?.task_type ?? TASK_TYPE.OTHER,
  is_active: obj.isActive,
  current_schema: obj.currentSchema,
  version: obj.version,
  created_at: obj.createdAt.toISOString(),
  updated_at: obj.updatedAt.toISOString(),
}));

/**
 * Task Template API response type
 */
export type TaskTemplateDto = z.infer<typeof taskTemplateDto>;

// For Studio Task Template Controller
export const createStudioTaskTemplateSchema = createTaskTemplateSchema;
export const updateStudioTaskTemplateSchema = createTaskTemplateSchema
  .partial()
  .extend({
    version: z.number().int(),
  })
  .refine(
    (data) => data.name || data.description || data.task_type || data.schema,
    'At least one field (name, description, task_type, or schema) must be provided',
  );

export type CreateStudioTaskTemplateInput = z.infer<typeof createStudioTaskTemplateSchema>;
export type UpdateStudioTaskTemplateInput = z.infer<typeof updateStudioTaskTemplateSchema>;

/**
 * Filter schema for listing task templates
 */
export const listTaskTemplatesFilterSchema = z.object({
  name: z.string().optional(),
  id: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

export type ListTaskTemplatesFilter = z.infer<typeof listTaskTemplatesFilterSchema>;

/**
 * Combined pagination and filter schema (before transformation)
 */
export const listTaskTemplatesQuerySchemaBase = paginationQuerySchema
  .and(listTaskTemplatesFilterSchema);

export const listTaskTemplatesQuerySchema = listTaskTemplatesQuerySchemaBase
  .transform(({ include_deleted, id, ...rest }: z.infer<typeof listTaskTemplatesQuerySchemaBase>) => ({
    ...rest,
    includeDeleted: include_deleted,
    uid: id,
  }));

/**
 * List task templates query input type (before transformation)
 * Use this for API request parameters
 * @example
 * const query: ListTaskTemplatesQuery = {
 *   page: 1,
 *   limit: 10,
 *   name: 'production',
 *   id: 'ttpl_abc123',
 *   include_deleted: false,
 * };
 */
export type ListTaskTemplatesQuery = z.input<typeof listTaskTemplatesQuerySchema>;

/**
 * List task templates query output type (after transformation)
 * Use this for validated and transformed query parameters in backend handlers
 */
export type ListTaskTemplatesQueryTransformed = z.infer<typeof listTaskTemplatesQuerySchema>;

/**
 * Admin query schema for listing task templates across studios
 */
export const listAdminTaskTemplatesQuerySchema = paginationBaseSchema
  .extend({
    search: z.string().trim().min(1).optional(),
    studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).optional(),
    studio_name: z.string().trim().min(1).optional(),
    task_type: z.nativeEnum(TASK_TYPE).optional(),
    is_active: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    include_deleted: z.coerce.boolean().default(false),
    sort: z.enum(['updated_at:desc', 'updated_at:asc', 'last_used_at:desc', 'last_used_at:asc']).default('updated_at:desc'),
  })
  .transform(transformPagination);

export type ListAdminTaskTemplatesQuery = z.input<typeof listAdminTaskTemplatesQuerySchema>;
export type ListAdminTaskTemplatesQueryTransformed = z.infer<typeof listAdminTaskTemplatesQuerySchema>;

/**
 * Usage summary for system admin task template management
 */
export const taskTemplateUsageSummaryDto = z.object({
  task_count_total: z.number().int(),
  task_count_active: z.number().int(),
  show_count_active: z.number().int(),
  last_used_at: z.string().datetime().nullable(),
});

export type TaskTemplateUsageSummaryDto = z.infer<typeof taskTemplateUsageSummaryDto>;

/**
 * System admin task template row DTO with usage summary
 */
export const adminTaskTemplateDto = z.object({
  id: z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE),
  studio_id: z.string().startsWith(UID_PREFIXES.STUDIO),
  studio_name: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  task_type: z.nativeEnum(TASK_TYPE),
  is_active: z.boolean(),
  version: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  usage_summary: taskTemplateUsageSummaryDto,
});

export type AdminTaskTemplateDto = z.infer<typeof adminTaskTemplateDto>;

/**
 * Admin schema for creating a task template (studio is explicit in body)
 */
export const createAdminTaskTemplateSchema = createTaskTemplateSchema.extend({
  studio_id: z.string().startsWith(UID_PREFIXES.STUDIO),
});

export type CreateAdminTaskTemplateInput = z.infer<typeof createAdminTaskTemplateSchema>;

/**
 * Admin schema for updating task template
 */
export const updateAdminTaskTemplateSchema = createTaskTemplateSchema
  .partial()
  .extend({
    version: z.number().int(),
  })
  .refine(
    (data) => data.name || data.description || data.task_type || data.schema,
    'At least one field (name, description, task_type, or schema) must be provided',
  );

export type UpdateAdminTaskTemplateInput = z.infer<typeof updateAdminTaskTemplateSchema>;

/**
 * Query schema for paginated template binding drill-down
 */
export const listAdminTaskTemplateBindingsQuerySchema = paginationBaseSchema
  .extend({
    status: z.union([z.nativeEnum(TASK_STATUS), z.array(z.nativeEnum(TASK_STATUS))]).optional(),
    show_start_from: z.string().datetime().optional(),
    show_start_to: z.string().datetime().optional(),
    include_deleted: z.coerce.boolean().default(false),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .transform(transformPagination);

export type ListAdminTaskTemplateBindingsQuery = z.input<typeof listAdminTaskTemplateBindingsQuerySchema>;
export type ListAdminTaskTemplateBindingsQueryTransformed = z.infer<typeof listAdminTaskTemplateBindingsQuerySchema>;

export const adminTaskTemplateBindingDto = z.object({
  task: z.object({
    id: z.string().startsWith(UID_PREFIXES.TASK),
    status: z.nativeEnum(TASK_STATUS),
    type: z.nativeEnum(TASK_TYPE),
    due_date: z.string().datetime().nullable(),
    deleted_at: z.string().datetime().nullable(),
  }),
  show: z.object({
    id: z.string().startsWith(UID_PREFIXES.SHOW),
    name: z.string(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    client_name: z.string().nullable(),
    studio_name: z.string().nullable(),
  }).nullable(),
  assignee: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable(),
});

export type AdminTaskTemplateBindingDto = z.infer<typeof adminTaskTemplateBindingDto>;
