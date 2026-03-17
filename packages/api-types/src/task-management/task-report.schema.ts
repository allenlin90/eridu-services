import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

import { TASK_STATUS } from './task.schema.js';
import { FieldTypeEnum } from './template-definition.schema.js';

/**
 * Date preset shortcuts used when managers save report definitions.
 * These are resolved to concrete dates by backend services at runtime.
 */
export const TASK_REPORT_DATE_PRESET = {
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  CUSTOM: 'custom',
} as const;

export type TaskReportDatePreset = (typeof TASK_REPORT_DATE_PRESET)[keyof typeof TASK_REPORT_DATE_PRESET];

export const taskReportDatePresetSchema = z.enum(TASK_REPORT_DATE_PRESET);

/**
 * Shared field categories are used to group canonical fields in settings and column picker UI.
 */
export const sharedFieldCategorySchema = z.enum(['metric', 'evidence', 'status']);

export type SharedFieldCategory = z.infer<typeof sharedFieldCategorySchema>;

export const sharedFieldKeySchema = z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/);

/**
 * Canonical cross-template field definition managed in studio settings.
 * Used by template builders to mark fields as shared (`standard: true`).
 */
export const sharedFieldSchema = z.object({
  key: sharedFieldKeySchema,
  type: FieldTypeEnum,
  category: sharedFieldCategorySchema,
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
});

export type SharedField = z.infer<typeof sharedFieldSchema>;

/**
 * Validation for the full shared-fields list stored in studio metadata.
 * Keys must be unique because report merging relies on key identity.
 */
export const sharedFieldsListSchema = z
  .array(sharedFieldSchema)
  .refine((items) => new Set(items.map((item) => item.key)).size === items.length, {
    message: 'Shared field keys must be unique',
  });

const submittedStatusesDefault = [
  TASK_STATUS.REVIEW,
  TASK_STATUS.COMPLETED,
  TASK_STATUS.CLOSED,
] as const;

const taskReportSubmittedStatusSchema = z.union([
  z.literal(TASK_STATUS.REVIEW),
  z.literal(TASK_STATUS.COMPLETED),
  z.literal(TASK_STATUS.CLOSED),
]);

/**
 * Scope filters that define which shows/tasks are included in sources, preflight, and run.
 * This is the server-side filtering layer for report generation.
 */
export const taskReportScopeSchema = z
  .object({
    date_preset: taskReportDatePresetSchema.optional(),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    show_standard_id: z.string().startsWith(UID_PREFIXES.SHOW_STANDARD).optional(),
    show_type_id: z.string().startsWith(UID_PREFIXES.SHOW_TYPE).optional(),
    show_ids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).optional(),
    submitted_statuses: z.array(taskReportSubmittedStatusSchema).default([...submittedStatusesDefault]),
    source_templates: z.array(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE)).optional(),
  })
  .superRefine((scope, ctx) => {
    const hasFilter
      = !!scope.date_preset
      || !!scope.date_from
      || !!scope.date_to
      || !!scope.show_standard_id
      || !!scope.show_type_id
      || (scope.show_ids?.length ?? 0) > 0
      || (scope.source_templates?.length ?? 0) > 0;

    if (!hasFilter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one scope filter is required',
      });
    }

    if ((scope.date_from && !scope.date_to) || (!scope.date_from && scope.date_to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_from'],
        message: 'date_from and date_to must be provided together',
      });
    }

    if (scope.date_from && scope.date_to && scope.date_from > scope.date_to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_from'],
        message: 'date_from must be before or equal to date_to',
      });
    }
  });

export type TaskReportScope = z.infer<typeof taskReportScopeSchema>;

/**
 * Field descriptor returned by source discovery for column selection UI.
 * Includes template provenance to distinguish custom fields across templates.
 */
export const taskReportFieldCatalogItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: FieldTypeEnum,
  standard: z.boolean().optional(),
  category: sharedFieldCategorySchema.optional(),
  source_template_id: z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE),
  source_template_name: z.string(),
});

export const taskReportSourceSchema = z.object({
  template_id: z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE),
  template_name: z.string(),
  task_type: z.string(),
  submitted_task_count: z.number().int().nonnegative(),
  fields: z.array(taskReportFieldCatalogItemSchema),
});

export type TaskReportSource = z.infer<typeof taskReportSourceSchema>;

/**
 * Response for contextual source discovery endpoint (`GET task-report-sources`).
 * FE uses `sources` for per-template fields and `shared_fields` for merged canonical picker group.
 */
export const taskReportSourcesResponseSchema = z.object({
  sources: z.array(taskReportSourceSchema),
  shared_fields: sharedFieldsListSchema,
});

export type TaskReportSourcesResponse = z.infer<typeof taskReportSourcesResponseSchema>;

/**
 * Lightweight count-only request executed before full report generation.
 */
export const taskReportPreflightRequestSchema = z.object({
  scope: taskReportScopeSchema,
});

export type TaskReportPreflightRequest = z.infer<typeof taskReportPreflightRequestSchema>;

/**
 * Preflight response used to confirm scope size and enforce guardrails in UI.
 */
export const taskReportPreflightResponseSchema = z.object({
  show_count: z.number().int().nonnegative(),
  task_count: z.number().int().nonnegative(),
  within_limit: z.boolean(),
  limit: z.number().int().positive(),
});

export type TaskReportPreflightResponse = z.infer<typeof taskReportPreflightResponseSchema>;

/**
 * Selected column payload sent from FE report builder to run endpoint.
 */
export const taskReportSelectedColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: FieldTypeEnum.optional(),
});

export type TaskReportSelectedColumn = z.infer<typeof taskReportSelectedColumnSchema>;

/**
 * Run request for synchronous report generation.
 * `definition_id` is optional trace metadata when run originates from saved preset.
 */
export const taskReportRunRequestSchema = z.object({
  scope: taskReportScopeSchema,
  columns: z.array(taskReportSelectedColumnSchema).min(1).max(50),
  definition_id: z.string().min(1).optional(),
});

export type TaskReportRunRequest = z.infer<typeof taskReportRunRequestSchema>;

/**
 * Structured warning item attached to generated results for data hygiene visibility.
 */
export const taskReportWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  show_id: z.string().startsWith(UID_PREFIXES.SHOW).optional(),
  column_key: z.string().optional(),
});

export const taskReportColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: FieldTypeEnum,
  source_template_id: z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE).nullable().optional(),
  source_template_name: z.string().nullable().optional(),
  standard: z.boolean().optional(),
  category: sharedFieldCategorySchema.optional(),
});

/**
 * Inline generated report result returned by run endpoint.
 * Rows are flat and show-centric (one row per show).
 */
export const taskReportResultSchema = z.object({
  rows: z.array(z.record(z.string(), z.any())),
  columns: z.array(taskReportColumnSchema),
  column_map: z.record(z.string(), z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE).nullable()),
  warnings: z.array(taskReportWarningSchema).default([]),
  row_count: z.number().int().nonnegative(),
  generated_at: z.iso.datetime(),
});

export type TaskReportResult = z.infer<typeof taskReportResultSchema>;

/**
 * Saved personal report definition (preset) metadata and payload.
 */
export const taskReportDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  definition: z.object({
    scope: taskReportScopeSchema,
    columns: z.array(taskReportSelectedColumnSchema).min(1).max(50),
  }),
  created_by_id: z.string().min(1).nullable().optional(),
  updated_by_id: z.string().min(1).nullable().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type TaskReportDefinition = z.infer<typeof taskReportDefinitionSchema>;

/**
 * Input schema for creating a new saved report definition.
 */
export const createTaskReportDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  definition: z.object({
    scope: taskReportScopeSchema,
    columns: z.array(taskReportSelectedColumnSchema).min(1).max(50),
  }),
});

export type CreateTaskReportDefinitionInput = z.infer<typeof createTaskReportDefinitionSchema>;

/**
 * Partial update schema for definition edits.
 */
export const updateTaskReportDefinitionSchema = createTaskReportDefinitionSchema
  .partial()
  .refine(
    (data) => data.name !== undefined || data.description !== undefined || data.definition !== undefined,
    'At least one field (name, description, or definition) must be provided',
  );

export type UpdateTaskReportDefinitionInput = z.infer<typeof updateTaskReportDefinitionSchema>;

/**
 * List query schema for definition landing page.
 */
export const listTaskReportDefinitionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
});

export type ListTaskReportDefinitionsQuery = z.infer<typeof listTaskReportDefinitionsQuerySchema>;

function normalizeStringArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Query parser for source discovery endpoint.
 * Supports comma-separated and repeated query params for array filters.
 */
export const getTaskReportSourcesQuerySchema = z
  .object({
    date_preset: taskReportDatePresetSchema.optional(),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    show_standard_id: z.string().startsWith(UID_PREFIXES.SHOW_STANDARD).optional(),
    show_type_id: z.string().startsWith(UID_PREFIXES.SHOW_TYPE).optional(),
    show_ids: z.union([z.string(), z.array(z.string())]).optional(),
    submitted_statuses: z.union([z.string(), z.array(z.string())]).optional(),
    source_templates: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .transform((query) => ({
    date_preset: query.date_preset,
    date_from: query.date_from,
    date_to: query.date_to,
    show_standard_id: query.show_standard_id,
    show_type_id: query.show_type_id,
    show_ids: normalizeStringArray(query.show_ids),
    submitted_statuses: normalizeStringArray(query.submitted_statuses) ?? [...submittedStatusesDefault],
    source_templates: normalizeStringArray(query.source_templates),
  }));

export type GetTaskReportSourcesQuery = z.infer<typeof getTaskReportSourcesQuerySchema>;

/**
 * Input schema for creating shared field entries in studio settings.
 */
export const createSharedFieldSchema = sharedFieldSchema.extend({
  is_active: z.boolean().optional(),
});

export type CreateSharedFieldInput = z.infer<typeof createSharedFieldSchema>;

/**
 * Input schema for mutable shared-field attributes only.
 */
export const updateSharedFieldSchema = z
  .object({
    label: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => data.label !== undefined || data.description !== undefined || data.is_active !== undefined,
    'At least one field (label, description, or is_active) must be provided',
  );

export type UpdateSharedFieldInput = z.infer<typeof updateSharedFieldSchema>;

/**
 * Response wrapper for shared fields settings endpoints.
 */
export const sharedFieldsResponseSchema = z.object({
  shared_fields: sharedFieldsListSchema,
});

export type SharedFieldsResponse = z.infer<typeof sharedFieldsResponseSchema>;
