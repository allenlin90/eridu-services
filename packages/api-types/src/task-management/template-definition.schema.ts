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

export const SystemFactKeyEnum = z.enum([
  'show_actual_start_time',
  'show_actual_end_time',
  'creator_actual_start_time',
  'creator_actual_end_time',
  'creator_attendance_missing',
  'show_platform_actual_start_time',
  'show_platform_actual_end_time',
  'show_platform_violation',
  'platform_gmv',
  'platform_view_count',
  'platform_ctr',
  'platform_cto',
]);

export type SystemFactKey = z.infer<typeof SystemFactKeyEnum>;

export const SYSTEM_FACT_KEY_DEFINITIONS = {
  show_actual_start_time: {
    label: 'Show actual start time',
    description: 'Overall show start recorded after the show begins.',
    target: 'show',
    backing_column: 'Show.actualStartTime',
    field_type: 'datetime',
  },
  show_actual_end_time: {
    label: 'Show actual end time',
    description: 'Overall show end recorded after the show completes.',
    target: 'show',
    backing_column: 'Show.actualEndTime',
    field_type: 'datetime',
  },
  creator_actual_start_time: {
    label: 'Creator actual start time',
    description: 'Creator attendance start recorded per assigned creator.',
    target: 'show_creator',
    backing_column: 'ShowCreator.actualStartTime',
    field_type: 'datetime',
  },
  creator_actual_end_time: {
    label: 'Creator actual end time',
    description: 'Creator attendance end recorded per assigned creator.',
    target: 'show_creator',
    backing_column: 'ShowCreator.actualEndTime',
    field_type: 'datetime',
  },
  creator_attendance_missing: {
    label: 'Creator attendance missing',
    description: 'No-show marker recorded per assigned creator.',
    target: 'show_creator',
    backing_column: 'ShowCreator.attendanceMissing',
    field_type: 'checkbox',
  },
  show_platform_actual_start_time: {
    label: 'Platform actual start time',
    description: 'Platform stream start recorded per assigned show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatform.actualStartTime',
    field_type: 'datetime',
  },
  show_platform_actual_end_time: {
    label: 'Platform actual end time',
    description: 'Platform stream end recorded per assigned show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatform.actualEndTime',
    field_type: 'datetime',
  },
  show_platform_violation: {
    label: 'Platform violation',
    description: 'Platform stream warning or violation recorded per assigned show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatformViolation',
    field_type: 'multiselect',
  },
  platform_gmv: {
    label: 'Platform GMV',
    description: 'Gross Merchandise Value recorded per show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatform.gmv',
    field_type: 'number',
  },
  platform_view_count: {
    label: 'Platform view count',
    description: 'Total viewers recorded per show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatform.viewerCount',
    field_type: 'number',
  },
  platform_ctr: {
    label: 'Platform CTR',
    description: 'Click-Through Rate percentage recorded per show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatform.ctr',
    field_type: 'number',
  },
  platform_cto: {
    label: 'Platform CTO',
    description: 'Click-To-Order percentage recorded per show platform.',
    target: 'show_platform',
    backing_column: 'ShowPlatform.cto',
    field_type: 'number',
  },
} as const satisfies Record<SystemFactKey, {
  label: string;
  description: string;
  target: 'show' | 'show_creator' | 'show_platform';
  backing_column: string;
  field_type: z.infer<typeof FieldTypeEnum>;
}>;

export function getSystemFactKeyDefinition(systemFactKey: SystemFactKey) {
  return SYSTEM_FACT_KEY_DEFINITIONS[systemFactKey];
}

type SystemFactKeyCompatibleField = {
  system_fact_key?: SystemFactKey;
  type?: z.infer<typeof FieldTypeEnum>;
};

export function validateSystemFactKeyCompatibility(data: SystemFactKeyCompatibleField, ctx: z.RefinementCtx) {
  if (!data.system_fact_key) {
    return;
  }

  const definition = SYSTEM_FACT_KEY_DEFINITIONS[data.system_fact_key as SystemFactKey];
  if (!definition) {
    return;
  }

  if (data.type !== definition.field_type) {
    ctx.issues.push({
      code: 'custom',
      message: `System fact key "${data.system_fact_key}" requires field type "${definition.field_type}"`,
      path: ['type'],
      input: data,
    });
  }
}

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
  system_fact_key: SystemFactKeyEnum.optional().describe('Closed catalog key for target-scoped operational fact extraction'),
});

export const FieldItemV2Schema = FieldItemV2BaseSchema.superRefine((data, ctx) => {
  validateFieldOptions(data, ctx);
  validateSystemFactKeyCompatibility(data, ctx);
});
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
    const seenSystemFacts = new Set<SystemFactKey>();
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

      if (!item.system_fact_key) {
        return;
      }
      if (seenSystemFacts.has(item.system_fact_key)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate system fact binding "${item.system_fact_key}" detected`,
          path: ['items', index, 'system_fact_key'],
          input: data,
        });
      }
      seenSystemFacts.add(item.system_fact_key);
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
