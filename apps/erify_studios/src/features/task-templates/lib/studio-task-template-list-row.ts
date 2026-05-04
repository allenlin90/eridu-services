import type {
  TaskTemplateDto,
  TaskTemplateKind,
  UiSchema,
} from '@eridu/api-types/task-management';
import { TASK_TEMPLATE_KIND } from '@eridu/api-types/task-management';

export type StudioTaskTemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  task_type: TaskTemplateDto['task_type'];
  template_kind: TaskTemplateKind;
  loop_count: number;
  shared_field_count: number;
  field_count: number;
  is_active: boolean;
  version: number;
  updated_at: string;
  template: TaskTemplateDto;
};

function readUiSchema(template: TaskTemplateDto): Partial<UiSchema> {
  const rawSchema = template.current_schema;
  return rawSchema && typeof rawSchema === 'object' ? rawSchema as Partial<UiSchema> : {};
}

export function deriveTaskTemplateKind(template: TaskTemplateDto): TaskTemplateKind {
  const schema = readUiSchema(template);
  const loops = Array.isArray(schema.metadata?.loops) ? schema.metadata.loops : [];
  return loops.length > 0 ? TASK_TEMPLATE_KIND.MODERATION : TASK_TEMPLATE_KIND.STANDARD;
}

export function toStudioTaskTemplateListRow(template: TaskTemplateDto): StudioTaskTemplateListRow {
  const schema = readUiSchema(template);
  const items = Array.isArray(schema.items) ? schema.items : [];
  const loops = Array.isArray(schema.metadata?.loops) ? schema.metadata.loops : [];

  return {
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    task_type: template.task_type,
    template_kind: loops.length > 0 ? TASK_TEMPLATE_KIND.MODERATION : TASK_TEMPLATE_KIND.STANDARD,
    loop_count: loops.length,
    shared_field_count: items.filter((item) => item.standard === true || Boolean((item as { shared_field_key?: string }).shared_field_key)).length,
    field_count: items.length,
    is_active: template.is_active,
    version: template.version,
    updated_at: template.updated_at,
    template,
  };
}
