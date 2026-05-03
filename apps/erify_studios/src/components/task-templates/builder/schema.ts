/* eslint-disable simple-import-sort/imports */
import { z } from 'zod';

import {
  createTaskTemplateFieldId,
  getSchemaEngine,
  FieldItemBaseSchema as SharedFieldItemBaseSchema,
  FieldItemV2Schema as SharedFieldItemV2Schema,
  FieldTypeEnum as SharedFieldTypeEnum,
  LoopMetadataSchema as SharedLoopMetadataSchema,
  TemplateMetadataSchema as SharedTemplateMetadataSchema,
  TemplateMetadataV2Schema as SharedTemplateMetadataV2Schema,
  TASK_TYPE,
  validateFieldOptions,
} from '@eridu/api-types/task-management';

export const FieldTypeEnum = SharedFieldTypeEnum;
export type FieldType = z.infer<typeof FieldTypeEnum>;

// ID is now required in the shared schema

export const FieldItemSchema = SharedFieldItemBaseSchema.superRefine(validateFieldOptions);

export type FieldItem = z.infer<typeof FieldItemSchema>;

export const LoopMetadataSchema = SharedLoopMetadataSchema;
export type LoopMetadata = z.infer<typeof LoopMetadataSchema>;

export const TemplateMetadataSchema = SharedTemplateMetadataSchema;

export const TemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  task_type: z.nativeEnum(TASK_TYPE),
  items: z.array(FieldItemSchema).min(1, 'At least one field is required'),
  metadata: TemplateMetadataSchema.optional(),
}).superRefine((data, ctx) => {
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

export type TemplateSchemaType = z.infer<typeof TemplateSchema>;

export const FieldItemV2Schema = SharedFieldItemV2Schema;
export type FieldItemV2 = z.infer<typeof FieldItemV2Schema>;

export const TemplateMetadataV2Schema = SharedTemplateMetadataV2Schema;

export const TemplateSchemaV2 = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  task_type: z.nativeEnum(TASK_TYPE),
  items: z.array(FieldItemV2Schema).min(1, 'At least one field is required'),
  metadata: TemplateMetadataV2Schema.optional(),
  schema_version: z.literal(2),
  schema_engine: z.literal('task_template_v2'),
  content_key_strategy: z.literal('field_id').optional(),
  report_projection_strategy: z.literal('descriptor').optional(),
}).superRefine((data, ctx) => {
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

export type TemplateSchemaV2Type = z.infer<typeof TemplateSchemaV2>;

export const BuilderTemplateSchema = z.union([TemplateSchema, TemplateSchemaV2]);
export type BuilderTemplateSchemaType = z.infer<typeof BuilderTemplateSchema>;

export function parseTemplateSchema(raw: unknown) {
  let engine: ReturnType<typeof getSchemaEngine>;
  try {
    engine = getSchemaEngine(raw);
  } catch (err) {
    throw new Error((err as Error).message);
  }

  // schema_version: 2 without a matching engine is an ambiguous document — fail closed.
  if (engine === 'task_template_v1' && (raw as Record<string, unknown>)?.schema_version === 2) {
    throw new Error('schema_version 2 requires schema_engine: "task_template_v2"');
  }

  if (engine === 'task_template_v2') {
    return TemplateSchemaV2.parse(raw);
  }
  return TemplateSchema.parse(raw);
}

export function safeParseBuilderTemplateSchema(raw: unknown) {
  try {
    return {
      success: true as const,
      data: parseTemplateSchema(raw),
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false as const,
        error: err,
      };
    }

    return {
      success: false as const,
      error: new z.ZodError([{
        code: 'custom',
        message: (err as Error).message,
        path: [],
        input: raw,
      }]),
    };
  }
}

export const defaultField: FieldItem = {
  id: crypto.randomUUID(),
  key: '',
  type: 'text',
  label: 'New Field',
  required: true,
};

export const defaultFieldV2: FieldItemV2 = {
  id: createTaskTemplateFieldId(),
  key: '',
  type: 'text',
  label: 'New Field',
  required: true,
};
