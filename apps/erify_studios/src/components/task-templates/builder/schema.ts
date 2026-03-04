/* eslint-disable simple-import-sort/imports */
import { z } from 'zod';

import {
  FieldItemBaseSchema as SharedFieldItemBaseSchema,
  FieldTypeEnum as SharedFieldTypeEnum,
  LoopMetadataSchema as SharedLoopMetadataSchema,
  TemplateMetadataSchema as SharedTemplateMetadataSchema,
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

export const defaultField: FieldItem = {
  id: crypto.randomUUID(),
  key: '',
  type: 'text',
  label: 'New Field',
  required: true,
};
