import { getFieldContentKey, type TaskDto } from '@eridu/api-types/task-management';

import type { UiSchema, UiSchemaV2 } from '@/lib/zod-schema-builder';

export type ProgressResult = {
  completed: number;
  total: number;
  percentage: number;
};

export function calculateTaskProgress(task: TaskDto, schema: UiSchema | UiSchemaV2): ProgressResult {
  const content = task.content || {};

  let completed = 0;
  let total = 0;

  for (const item of schema.items) {
    if (!item.required)
      continue;

    total++;

    const value = content[getFieldContentKey(schema, item)];
    const isComplete = isFieldComplete(item.type, value);

    if (isComplete)
      completed++;
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function isFieldComplete(type: string, value: unknown): boolean {
  if (value === null || value === undefined)
    return false;

  switch (type) {
    case 'checkbox':
      return value === true;
    case 'text':
    case 'textarea':
      return typeof value === 'string' && value.trim().length > 0;
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'select':
    case 'multiselect':
      return Array.isArray(value) ? value.length > 0 : (typeof value === 'string' && value.length > 0);
    case 'date':
    case 'datetime':
    case 'url':
    case 'file':
      return typeof value === 'string' && value.length > 0;
    default:
      return false;
  }
}
