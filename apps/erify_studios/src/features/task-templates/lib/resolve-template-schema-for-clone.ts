import {
  createTaskTemplateFieldId,
  getSchemaEngine,
  type TaskTemplateDto,
  type UiSchema,
  type UiSchemaV2,
} from '@eridu/api-types/task-management';

/**
 * Builds the `schema` payload for cloning an existing template.
 *
 * The clone must round-trip through the same backend validator as the original
 * (`safeParseTemplateSchema`), which selects the v1 vs v2 engine purely from the
 * top-level `schema_engine` marker. Dropping those engine fields silently
 * downgrades a v2 template to the v1 validator, which then rejects v2-only field
 * keys such as `shared_field_key` with `unrecognized_keys` (HTTP 400). Whenever
 * the template schema gains new top-level engine metadata, it must be preserved
 * here too.
 */
export function resolveTemplateSchemaForClone(template: TaskTemplateDto): UiSchema | UiSchemaV2 {
  const rawSchema = (template.current_schema ?? {}) as Partial<UiSchemaV2> & Record<string, unknown>;
  const rawItems = Array.isArray(rawSchema.items) ? rawSchema.items : [];
  const engine = getSchemaEngine(rawSchema);
  const isV2 = engine === 'task_template_v2';

  // Generate new IDs for cloned fields to avoid collisions. v2 field IDs must
  // match the `fld_` pattern enforced by the v2 validator, so they cannot reuse
  // the v1 `crypto.randomUUID()` format.
  const items = rawItems.map((item) => ({
    ...item,
    id: isV2 ? createTaskTemplateFieldId() : crypto.randomUUID(),
  }));

  if (isV2) {
    return {
      schema_version: 2,
      schema_engine: 'task_template_v2',
      ...(rawSchema.content_key_strategy ? { content_key_strategy: rawSchema.content_key_strategy } : {}),
      ...(rawSchema.report_projection_strategy
        ? { report_projection_strategy: rawSchema.report_projection_strategy }
        : {}),
      items,
      ...(rawSchema.metadata ? { metadata: rawSchema.metadata } : {}),
    } as UiSchemaV2;
  }

  return {
    items,
    ...(rawSchema.metadata ? { metadata: rawSchema.metadata } : {}),
  } as UiSchema;
}
