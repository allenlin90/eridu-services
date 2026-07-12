import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';

import type { BuilderTemplateSchemaType, FieldItem } from './schema';
import { createUniqueSharedFieldKey } from './task-template-builder.utils';

import type { ClientMechanic } from '@/features/client-mechanics/api/get-client-mechanics';

export function buildMechanicUpgradePatch(
  item: FieldItem,
  mechanic: ClientMechanic,
): Partial<FieldItem> {
  if (!item.mechanic_ref)
    return {};
  return {
    label: mechanic.instruction_label,
    description: mechanic.instruction_body,
    mechanic_ref: {
      ...item.mechanic_ref,
      content_revision: mechanic.content_revision,
    },
  };
}

export function upgradeAllMechanicReferences(
  template: BuilderTemplateSchemaType,
  mechanics: ClientMechanic[],
): BuilderTemplateSchemaType {
  return {
    ...template,
    items: template.items.map((item) => {
      if (!item.mechanic_ref)
        return item;
      const mechanic = mechanics.find((candidate) => candidate.id === item.mechanic_ref?.mechanic_id);
      return mechanic && mechanic.content_revision > item.mechanic_ref.content_revision
        ? { ...item, ...buildMechanicUpgradePatch(item, mechanic) }
        : item;
    }),
  };
}

export function assignMechanicToLoop(
  template: BuilderTemplateSchemaType,
  mechanic: ClientMechanic,
  loopId: string,
): BuilderTemplateSchemaType {
  const isV2 = getSchemaEngine(template) === 'task_template_v2';
  const baseKey = mechanic.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const itemKey = isV2
    ? baseKey
    : createUniqueSharedFieldKey(
        baseKey,
        new Set(template.items.map((item) => item.key)),
        loopId,
      );
  const newField: FieldItem = {
    id: createTaskTemplateFieldId(),
    key: itemKey,
    type: 'checkbox',
    label: mechanic.instruction_label,
    description: mechanic.instruction_body,
    required: true,
    group: loopId,
    mechanic_ref: {
      client_id: template.client_id!,
      mechanic_id: mechanic.id,
      content_revision: mechanic.content_revision,
    },
  };
  return { ...template, items: [...template.items, newField] };
}

export function removeMechanicFromLoop(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
  loopId: string,
): BuilderTemplateSchemaType {
  return {
    ...template,
    items: template.items.filter(
      (item) => !(item.group === loopId && item.mechanic_ref?.mechanic_id === mechanicId),
    ),
  };
}
