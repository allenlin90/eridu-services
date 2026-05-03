export type SchemaEngineType = 'task_template_v1' | 'task_template_v2';

export const TASK_TEMPLATE_FIELD_ID_PATTERN = /^fld_[a-z0-9]{10,}$/;

export function isTaskTemplateFieldId(value: string): boolean {
  return TASK_TEMPLATE_FIELD_ID_PATTERN.test(value);
}

export function createTaskTemplateFieldId(): `fld_${string}` {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(11);
  globalThis.crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `fld_${id}`;
}

export function getSchemaEngine(schema: unknown): SchemaEngineType {
  const engine = (schema as Record<string, unknown> | null | undefined)?.schema_engine;

  if (!engine) {
    return 'task_template_v1'; // absence of engine metadata is the permanent v1 marker
  }

  if (engine === 'task_template_v1' || engine === 'task_template_v2') {
    return engine;
  }

  throw new Error(`Unsupported schema engine: ${String(engine)}`);
}

export function getFieldContentKey(schema: unknown, field: { key: string; id?: string }): string {
  const engine = getSchemaEngine(schema);

  if (engine === 'task_template_v1') {
    return field.key;
  }

  if (!field.id) {
    throw new Error('v2 field is missing an id');
  }
  return field.id;
}

export function getFieldSharedKey(
  schema: unknown,
  field: { key: string; standard?: boolean; shared_field_key?: string },
): string | null {
  const engine = getSchemaEngine(schema);

  if (engine === 'task_template_v1') {
    return field.standard ? field.key : null;
  }

  return field.shared_field_key ?? null;
}

export function getFieldReportColumnKey(_schema: unknown, _templateUid: string, _field: unknown): string {
  // Phase 3 stub — not yet implemented
  throw new Error('getFieldReportColumnKey is a Phase 3 stub — not yet implemented');
}

export function getFieldReportDescriptor(_schema: unknown, _templateUid: string, _field: unknown): string {
  // Phase 3 stub — not yet implemented
  throw new Error('getFieldReportDescriptor is a Phase 3 stub — not yet implemented');
}
