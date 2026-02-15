import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { paginationQuerySchema } from '../pagination/index.js';

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
    (data) => data.name || data.description || data.schema,
    'At least one field (name, description, or schema) must be provided',
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
