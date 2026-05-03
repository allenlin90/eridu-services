import { z } from 'zod';

import { getSchemaEngine, TASK_TEMPLATE_FIELD_ID_PATTERN } from './task-schema-engine.js';

export const RequireReasonCriterion = z.object({
  op: z.enum(['lt', 'lte', 'gt', 'gte', 'eq', 'neq', 'in', 'not_in']),
  value: z.union([z.number(), z.string(), z.array(z.string())]),
});

export const FieldTypeEnum = z.enum([
  'text',
  'number',
  'checkbox',
  'select',
  'multiselect',
  'date',
  'datetime',
  'file',
  'url',
  'textarea',
]);

export const FieldItemBaseSchema = z
  .object({
    id: z.string().describe('Stable unique ID for each field item'),
    key: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case (English)'),
    type: FieldTypeEnum,
    standard: z
      .boolean()
      .optional()
      .describe(
        'True if this field uses a shared field key. Shared fields merge across templates in reports.',
      ),
    label: z.string().min(1).max(200).describe('User-facing label text'),
    description: z.string().max(500).optional(),
    group: z.string().optional().describe('Loop / visual grouping identifier'),
    required: z.boolean().optional().default(true),
    options: z
      .array(
        z.object({
          id: z.string().optional(),
          value: z.string(),
          label: z.string(),
        }),
      )
      .optional(),
    validation: z
      .object({
        min_length: z.number().int().positive().optional(),
        max_length: z.number().int().positive().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        accept: z.string().optional(),
        max_size: z.number().positive().optional(),
        custom_message: z.string().optional(),
        require_reason: z
          .union([
            z.enum(['on-true', 'on-false', 'always']),
            z.array(RequireReasonCriterion),
          ])
          .optional(),
      })
      .strict()
      .optional(),
    default_value: z.any().optional(),
  })
  .strict();

export function validateFieldOptions(data: any, ctx: z.RefinementCtx) {
  if ((data.type === 'select' || data.type === 'multiselect') && (!data.options || data.options.length === 0)) {
    ctx.issues.push({
      code: 'custom',
      message: 'Options are required for select and multiselect fields',
      path: ['options'],
      input: data,
    });
  }
}

export const FieldItemSchema = FieldItemBaseSchema.superRefine(validateFieldOptions);

export const LoopMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  durationMin: z.number().int().positive().default(15),
});

export const LoopMetadataV2Schema = LoopMetadataSchema.extend({
  id: z.string().regex(/^l\d+$/, 'Loop ID must be l followed by digits (e.g., l1, l2)'),
});

export type LoopMetadata = z.infer<typeof LoopMetadataSchema>;

export const TemplateMetadataSchema = z.object({
  loops: z.array(LoopMetadataSchema).optional(),
}).catchall(z.any());

export const TemplateMetadataV2Schema = z.object({
  loops: z.array(LoopMetadataV2Schema).optional(),
}).catchall(z.any());

export const TemplateSchemaValidator = z
  .object({
    items: z.array(FieldItemSchema).min(1),
    metadata: TemplateMetadataSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    data.items.forEach((item, index) => {
      if (keys.has(item.key)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate key detected: "${item.key}"`,
          path: ['items', index, 'key'],
          input: data,
        });
      }
      keys.add(item.key);
    });
  });

export const FieldItemV2BaseSchema = FieldItemBaseSchema.omit({ standard: true }).extend({
  id: z.string().regex(TASK_TEMPLATE_FIELD_ID_PATTERN, 'Invalid field ID format (must be fld_ + 10+ alphanumeric)'),
  shared_field_key: z.string().optional().describe('Canonical key for shared field mapping'),
});

export const FieldItemV2Schema = FieldItemV2BaseSchema.superRefine(validateFieldOptions);
export type FieldItemV2 = z.infer<typeof FieldItemV2Schema>;

export const TemplateSchemaV2Validator = z
  .object({
    schema_version: z.literal(2),
    schema_engine: z.literal('task_template_v2'),
    content_key_strategy: z.literal('field_id').optional(),
    report_projection_strategy: z.literal('descriptor').optional(),
    items: z.array(FieldItemV2Schema).min(1),
    metadata: TemplateMetadataV2Schema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // v2 key uniqueness: checks per-loop (key, group) uniqueness instead of global uniqueness
    const seen = new Set<string>();
    data.items.forEach((item, index) => {
      const groupSegment = item.group ?? 'none';
      const compositeKey = `${groupSegment}:${item.key}`;
      if (seen.has(compositeKey)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate key "${item.key}" detected in group "${item.group ?? 'root'}"`,
          path: ['items', index, 'key'],
          input: data,
        });
      }
      seen.add(compositeKey);
    });
  });

function resolveEngine(raw: unknown): { engine: 'task_template_v1' | 'task_template_v2' } | { error: string } {
  let engine: 'task_template_v1' | 'task_template_v2';
  try {
    engine = getSchemaEngine(raw);
  } catch (err) {
    return { error: (err as Error).message };
  }

  // schema_version: 2 without a matching engine means the writer forgot schema_engine — fail closed.
  const version = (raw as Record<string, unknown>)?.schema_version;
  if (engine === 'task_template_v1' && version === 2) {
    return { error: 'schema_version 2 requires schema_engine: "task_template_v2"' };
  }

  return { engine };
}

export function parseTemplateSchema(raw: unknown) {
  const resolved = resolveEngine(raw);
  if ('error' in resolved) {
    throw new z.ZodError([{ code: 'custom', message: resolved.error, path: ['schema_engine'], input: raw }]);
  }
  if (resolved.engine === 'task_template_v2') {
    return TemplateSchemaV2Validator.parse(raw);
  }
  return TemplateSchemaValidator.parse(raw);
}

export function safeParseTemplateSchema(raw: unknown) {
  const resolved = resolveEngine(raw);
  if ('error' in resolved) {
    return {
      success: false as const,
      error: new z.ZodError([{ code: 'custom', message: resolved.error, path: ['schema_engine'], input: raw }]),
    };
  }
  if (resolved.engine === 'task_template_v2') {
    return TemplateSchemaV2Validator.safeParse(raw);
  }
  return TemplateSchemaValidator.safeParse(raw);
}

export type UiSchema = z.infer<typeof TemplateSchemaValidator>;
export type UiSchemaV2 = z.infer<typeof TemplateSchemaV2Validator>;
export type FieldItem = z.infer<typeof FieldItemSchema>;
