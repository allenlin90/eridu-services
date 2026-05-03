/**
 * Task Schema Engine
 *
 * Provides schema engine routing and backwards-compatible getters
 * for task template metadata.
 *
 * Task templates migrated to v2 schema will have:
 * - schema_version: 2
 * - schema_engine: 'task_template_v2'
 *
 * Implicit (legacy) templates are treated as v1.
 */

// We use crypto.getRandomValues in a cross-platform way if possible,
// but since this is in api-types, we need to be careful about Node vs Browser.
// We will just use nanoid or a custom generator. We'll use a simple fallback.

export type SchemaEngineType = 'task_template_v1' | 'task_template_v2';

export const TASK_TEMPLATE_FIELD_ID_PATTERN = /^fld_[a-z0-9]{10,}$/;

export function isTaskTemplateFieldId(value: string): boolean {
  return TASK_TEMPLATE_FIELD_ID_PATTERN.test(value);
}

export function createTaskTemplateFieldId(): string {
  // Generate a random lowercase alphanumeric string
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  // Simple fallback since we don't know the exact env here,
  // but Math.random is sufficient for UI client generation of a nanoid-like string
  for (let i = 0; i < 11; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `fld_${randomString}`;
}

export function getSchemaEngine(schema: any): SchemaEngineType {
  if (!schema?.schema_engine) {
    return 'task_template_v1';
  }

  if (schema.schema_engine === 'task_template_v2') {
    return 'task_template_v2';
  }

  throw new Error(`Unsupported schema engine: ${schema.schema_engine}`);
}

export function getFieldContentKey(schema: any, field: any): string {
  const engine = getSchemaEngine(schema);

  if (engine === 'task_template_v1') {
    return field.key;
  }

  if (engine === 'task_template_v2') {
    if (!field.id) {
      throw new Error('v2 field is missing an id');
    }
    return field.id;
  }

  throw new Error(`Unsupported schema engine: ${engine}`);
}

export function getFieldSharedKey(schema: any, field: any): string | null {
  const engine = getSchemaEngine(schema);

  if (engine === 'task_template_v1') {
    return field.standard ? field.key : null;
  }

  if (engine === 'task_template_v2') {
    return field.shared_field_key ?? null;
  }

  throw new Error(`Unsupported schema engine: ${engine}`);
}

export function getFieldReportColumnKey(_schema: any, _templateUid: string, _field: any): string {
  // Stub for Phase 3
  throw new Error('Not implemented');
}

export function getFieldReportDescriptor(_schema: any, _templateUid: string, _field: any): string {
  // Stub for Phase 3
  throw new Error('Not implemented');
}
