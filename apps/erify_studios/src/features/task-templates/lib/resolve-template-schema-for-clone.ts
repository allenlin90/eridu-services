import type { TaskTemplateDto, UiSchema } from '@eridu/api-types/task-management';

export function resolveTemplateSchemaForClone(template: TaskTemplateDto): UiSchema {
  const rawSchema = template.current_schema as Partial<UiSchema> | undefined;
  const rawItems = rawSchema?.items;

  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => ({
        ...item,
        // Generate new IDs for cloned fields to avoid collisions.
        id: crypto.randomUUID(),
      }))
    : [];

  return {
    items,
    ...(rawSchema?.metadata ? { metadata: rawSchema.metadata } : {}),
  };
}
