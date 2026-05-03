import {
  safeParseTemplateSchema,
  type UiSchema,
  type UiSchemaV2,
} from '@eridu/api-types/task-management';

type RawSchemaContainer = {
  items?: unknown;
  metadata?: unknown;
  schema?: unknown;
  current_schema?: unknown;
  currentSchema?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pickUiSchemaShape(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  if ('items' in value) {
    const schema = value as RawSchemaContainer;
    if (value.schema_engine === 'task_template_v2' || value.schema_version === 2) {
      return value;
    }

    return {
      items: schema.items,
      ...(schema.metadata !== undefined ? { metadata: schema.metadata } : {}),
    };
  }

  if ('schema' in value) {
    return pickUiSchemaShape((value as RawSchemaContainer).schema);
  }

  if ('current_schema' in value) {
    return pickUiSchemaShape((value as RawSchemaContainer).current_schema);
  }

  if ('currentSchema' in value) {
    return pickUiSchemaShape((value as RawSchemaContainer).currentSchema);
  }

  return value;
}

export function resolveUiSchema(snapshotSchema: unknown): UiSchema | UiSchemaV2 | null {
  const direct = safeParseTemplateSchema(snapshotSchema);
  if (direct.success) {
    return direct.data;
  }

  const normalized = pickUiSchemaShape(snapshotSchema);
  const fallback = safeParseTemplateSchema(normalized);
  if (fallback.success) {
    return fallback.data;
  }

  return null;
}
