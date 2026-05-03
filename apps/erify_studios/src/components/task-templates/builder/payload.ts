import { getSchemaEngine } from '@eridu/api-types/task-management';

import type { BuilderTemplateSchemaType, FieldItem } from './schema';

export function isTaskTemplateV2BuilderEnabled(): boolean {
  return import.meta.env.VITE_TASK_TEMPLATE_V2_BUILDER === 'true';
}

export function createDefaultBuilderTemplate(): BuilderTemplateSchemaType {
  const base = {
    name: '',
    description: '',
    task_type: 'SETUP' as const,
    items: [],
  };

  if (!isTaskTemplateV2BuilderEnabled()) {
    return base;
  }

  return {
    ...base,
    schema_version: 2,
    schema_engine: 'task_template_v2',
    content_key_strategy: 'field_id',
    report_projection_strategy: 'descriptor',
  };
}

export function shouldUseSavedBuilderDraft(saved: unknown): saved is Partial<BuilderTemplateSchemaType> {
  if (!saved || typeof saved !== 'object') {
    return false;
  }

  if (!isTaskTemplateV2BuilderEnabled() && (saved as { schema_engine?: unknown }).schema_engine === 'task_template_v2') {
    return false;
  }

  return true;
}

export function buildTemplateSchemaPayload(data: BuilderTemplateSchemaType) {
  const schemaItems = data.items.map((item: FieldItem) => ({
    ...item,
    options: item.options?.filter((option) => option.value.trim() !== ''),
  }));

  const schemaMetadata = data.metadata && Object.keys(data.metadata).length > 0
    ? data.metadata
    : undefined;

  const engine = getSchemaEngine(data);
  const v2Envelope = engine === 'task_template_v2'
    ? {
        schema_version: 2 as const,
        schema_engine: 'task_template_v2' as const,
        content_key_strategy: 'field_id' as const,
        report_projection_strategy: 'descriptor' as const,
      }
    : {};

  return {
    ...v2Envelope,
    items: schemaItems,
    ...(schemaMetadata ? { metadata: schemaMetadata } : {}),
  };
}

export function hasTemplateSchemaEngineMismatch(
  localSchema: unknown,
  serverSchema: unknown,
): boolean {
  try {
    return getSchemaEngine(localSchema) !== getSchemaEngine(serverSchema);
  } catch {
    return true;
  }
}
