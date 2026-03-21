import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

import { TASK_STATUS } from './task.schema.js';
import { FieldTypeEnum } from './template-definition.schema.js';

/**
 * Date preset shortcuts used when managers save report definitions.
 * FE may keep preset labels for UX, but request payloads must include explicit dates.
 */
export const TASK_REPORT_DATE_PRESET = {
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  CUSTOM: 'custom',
} as const;

export type TaskReportDatePreset = (typeof TASK_REPORT_DATE_PRESET)[keyof typeof TASK_REPORT_DATE_PRESET];

export const taskReportDatePresetSchema = z.enum(TASK_REPORT_DATE_PRESET);

/**
 * Built-in show-level columns available in report builder.
 * These do not depend on task template snapshots.
 */
export const TASK_REPORT_SYSTEM_COLUMN = {
  SHOW_ID: 'show_id',
  SHOW_NAME: 'show_name',
  SHOW_EXTERNAL_ID: 'show_external_id',
  CLIENT_NAME: 'client_name',
  STUDIO_ROOM_NAME: 'studio_room_name',
  SHOW_STANDARD_NAME: 'show_standard_name',
  SHOW_TYPE_NAME: 'show_type_name',
  START_TIME: 'start_time',
  END_TIME: 'end_time',
} as const;

export type TaskReportSystemColumnKey
  = (typeof TASK_REPORT_SYSTEM_COLUMN)[keyof typeof TASK_REPORT_SYSTEM_COLUMN];

/**
 * Shared field categories are used to group canonical fields in settings and column picker UI.
 */
export const sharedFieldCategorySchema = z.enum(['metric', 'evidence', 'status']);

export type SharedFieldCategory = z.infer<typeof sharedFieldCategorySchema>;

/**
 * View-filter metadata keys injected into every result row by the run pipeline.
 * These occupy the same namespace as user-selectable columns, so shared field
 * keys must not collide with them. Keep this list in sync with the metadata
 * keys written by `TaskReportRunService.buildRows()`.
 */
export const TASK_REPORT_VIEW_FILTER_KEYS = {
  CLIENT_ID: 'client_id',
  STUDIO_ROOM_ID: 'studio_room_id',
  STUDIO_ROOM_NAME: 'studio_room_name',
  SHOW_STATUS_ID: 'show_status_id',
  SHOW_STATUS_NAME: 'show_status_name',
  ASSIGNEE_ID: 'assignee_id',
  ASSIGNEE_NAME: 'assignee_name',
  ASSIGNEE_IDS: 'assignee_ids',
  ASSIGNEE_NAMES: 'assignee_names',
} as const;

const reservedSharedFieldKeys = new Set<string>([
  ...Object.values(TASK_REPORT_SYSTEM_COLUMN),
  ...Object.values(TASK_REPORT_VIEW_FILTER_KEYS),
]);

export const sharedFieldKeySchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-z0-9_]*$/)
  .refine((key) => !reservedSharedFieldKeys.has(key), {
    message: 'Shared field key cannot use reserved report column or view-filter keys',
  });

/**
 * Canonical cross-template field definition managed in studio settings.
 * Used by template builders to mark fields as shared (`standard: true`).
 */
export const sharedFieldSchema = z.object({
  key: sharedFieldKeySchema,
  type: FieldTypeEnum,
  category: sharedFieldCategorySchema,
  label: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
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

const clientScopeFilterSchema = z
  .union([
    z.string().startsWith(UID_PREFIXES.CLIENT),
    z.array(z.string().startsWith(UID_PREFIXES.CLIENT)),
  ])
  .transform((value) => Array.isArray(value) ? value : [value]);

const showStandardScopeFilterSchema = z
  .union([
    z.string().startsWith(UID_PREFIXES.SHOW_STANDARD),
    z.array(z.string().startsWith(UID_PREFIXES.SHOW_STANDARD)),
  ])
  .transform((value) => Array.isArray(value) ? value : [value]);

const showTypeScopeFilterSchema = z
  .union([
    z.string().startsWith(UID_PREFIXES.SHOW_TYPE),
    z.array(z.string().startsWith(UID_PREFIXES.SHOW_TYPE)),
  ])
  .transform((value) => Array.isArray(value) ? value : [value]);

/**
 * Scope filters that define which shows/tasks are included in sources, preflight, and run.
 * This is the server-side filtering layer for report generation.
 * `date_from` and `date_to` are mandatory for execution requests.
 */
export const taskReportScopeSchema = z
  .object({
    date_preset: taskReportDatePresetSchema.optional(),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    client_id: clientScopeFilterSchema.optional(),
    show_standard_id: showStandardScopeFilterSchema.optional(),
    show_type_id: showTypeScopeFilterSchema.optional(),
    show_ids: z.array(z.string().startsWith(UID_PREFIXES.SHOW)).optional(),
    submitted_statuses: z.array(taskReportSubmittedStatusSchema).default([...submittedStatusesDefault]),
    source_templates: z.array(z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE)).optional(),
  })
  .superRefine((scope, ctx) => {
    // Reporting must be explicitly bounded by date range.
    if (!scope.date_from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_from'],
        message: 'date_from and date_to are required',
      });
    }

    if (!scope.date_to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_to'],
        message: 'date_from and date_to are required',
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
  // Selectable column key expected by run endpoint:
  // - standard field: "{field_key}"
  // - custom field: "{template_uid}:{field_key}"
  key: z.string().min(1),
  // Raw field key in template snapshot schema.items[].key.
  field_key: z.string().min(1),
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
  template_id: z.string().startsWith(UID_PREFIXES.TASK_TEMPLATE).optional(),
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

export type TaskReportColumn = z.infer<typeof taskReportColumnSchema>;

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
 * Saved report definition (studio-shared preset) metadata and payload.
 */
export const taskReportDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  definition: z.object({
    scope: taskReportScopeSchema,
    columns: z.array(taskReportSelectedColumnSchema).min(1).max(50),
  }),
  version: z.number().int().positive(),
  // Definitions are studio-shared — only creator tracking is supported in MVP.
  // updated_by_id is intentionally omitted (no updater relation in the DB model).
  created_by_id: z.string().min(1).nullable().optional(),
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
  .extend({
    description: z.string().max(500).nullable().optional(),
    version: z.number().int().positive(),
  })
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
 * Date range is mandatory through `taskReportScopeSchema` parse.
 */
export const getTaskReportSourcesQuerySchema = z
  .object({
    date_preset: taskReportDatePresetSchema.optional(),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    client_id: z.union([z.string(), z.array(z.string())]).optional(),
    show_standard_id: z.union([z.string(), z.array(z.string())]).optional(),
    show_type_id: z.union([z.string(), z.array(z.string())]).optional(),
    show_ids: z.union([z.string(), z.array(z.string())]).optional(),
    submitted_statuses: z.union([z.string(), z.array(z.string())]).optional(),
    source_templates: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .transform((query) => taskReportScopeSchema.parse({
    date_preset: query.date_preset,
    date_from: query.date_from,
    date_to: query.date_to,
    client_id: normalizeStringArray(query.client_id),
    show_standard_id: normalizeStringArray(query.show_standard_id),
    show_type_id: normalizeStringArray(query.show_type_id),
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
    description: z.string().max(500).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
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
