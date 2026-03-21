import { z } from 'zod';

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

export type LoopMetadata = z.infer<typeof LoopMetadataSchema>;

export const TemplateMetadataSchema = z.object({
  loops: z.array(LoopMetadataSchema).optional(),
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

export type UiSchema = z.infer<typeof TemplateSchemaValidator>;
export type FieldItem = z.infer<typeof FieldItemSchema>;
