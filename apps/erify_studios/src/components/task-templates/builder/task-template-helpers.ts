import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';

import { type BuilderTemplateSchemaType, type FieldItem, isSharedField, type LoopMetadata } from './schema';

export const DEFAULT_LOOP_DURATION_MIN = 15;

export function buildLoopMetadataFromTemplate(template: BuilderTemplateSchemaType): LoopMetadata[] {
  const metadataLoops = template.metadata?.loops;
  const normalizedFromMetadata = Array.isArray(metadataLoops)
    ? metadataLoops
        .filter((loop): loop is LoopMetadata => !!loop?.id && !!loop?.name)
        .map((loop) => ({
          id: loop.id,
          name: loop.name,
          durationMin: loop.durationMin > 0 ? loop.durationMin : DEFAULT_LOOP_DURATION_MIN,
        }))
    : [];

  const knownIds = new Set(normalizedFromMetadata.map((loop) => loop.id));
  const fallbackGroups = Array.from(
    new Set(template.items.map((item) => item.group).filter((group): group is string => !!group)),
  );

  for (const group of fallbackGroups) {
    if (!knownIds.has(group)) {
      normalizedFromMetadata.push({ id: group, name: group, durationMin: DEFAULT_LOOP_DURATION_MIN });
    }
  }

  return normalizedFromMetadata;
}

export function omitLoopsFromMetadata(
  metadata: BuilderTemplateSchemaType['metadata'],
): BuilderTemplateSchemaType['metadata'] | undefined {
  if (!metadata) {
    return undefined;
  }
  const { loops: _ignored, ...rest } = metadata;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export function createNextLoop(existingLoops: LoopMetadata[]): LoopMetadata {
  const existingIds = new Set(existingLoops.map((loop) => loop.id));
  let ordinal = existingLoops.length + 1;
  let id = `l${ordinal}`;

  while (existingIds.has(id)) {
    ordinal += 1;
    id = `l${ordinal}`;
  }

  return { id, name: `Loop ${ordinal}`, durationMin: DEFAULT_LOOP_DURATION_MIN };
}

export function createUniqueCopiedKey(originalKey: string, usedKeys: Set<string>): string {
  const baseWithCopy = originalKey.endsWith('_copy') ? originalKey : `${originalKey}_copy`;
  const normalizedBase = baseWithCopy.slice(0, 50);

  let candidate = normalizedBase;
  let counter = 2;
  while (usedKeys.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${normalizedBase.slice(0, 50 - suffix.length)}${suffix}`;
    counter += 1;
  }

  usedKeys.add(candidate);
  return candidate;
}

export function createUniqueSharedFieldKey(
  sharedKey: string,
  usedKeys: Set<string>,
  targetLoopId?: string,
): string {
  // Always prefer the canonical shared key first — even in moderation mode.
  // Only fall back to a loop-scoped variant when the canonical key is already taken.
  if (!usedKeys.has(sharedKey)) {
    usedKeys.add(sharedKey);
    return sharedKey;
  }

  const preferredBase = targetLoopId ? `${sharedKey}_${targetLoopId}` : sharedKey;
  const normalizedBase = preferredBase.slice(0, 50);

  if (!usedKeys.has(normalizedBase)) {
    usedKeys.add(normalizedBase);
    return normalizedBase;
  }

  let counter = 2;
  let candidate = normalizedBase;
  while (usedKeys.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${normalizedBase.slice(0, 50 - suffix.length)}${suffix}`;
    counter += 1;
  }
  usedKeys.add(candidate);
  return candidate;
}

export function createTextFieldForTemplate(
  template: BuilderTemplateSchemaType,
  group?: string,
): FieldItem {
  const engine = getSchemaEngine(template);

  return {
    id: engine === 'task_template_v2' ? createTaskTemplateFieldId() : crypto.randomUUID(),
    key: `field_${Date.now()}`,
    type: 'text',
    label: 'New Question',
    required: true,
    ...(group ? { group } : {}),
  };
}

// -----------------------------------------------------------------------------
// Mechanic library — template-local model for PR 11.7
// -----------------------------------------------------------------------------
//
// Rides on `metadata` catchall; no api-types change. See
// `apps/erify_studios/docs/design/TASK_TEMPLATE_LOOP_GRID_VIEW_DESIGN.md`.

export type Mechanic = {
  id: string;
  label: string;
  description?: string;
};

export type MechanicAssignments = Record<string, string>;

type MechanicMetadata = {
  mechanics?: Mechanic[];
  mechanicAssignments?: MechanicAssignments;
};

function createMechanicId(): string {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `mech_${random}`;
}

function createCheckboxKey(): string {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `mechanic_${random}`;
}

function readMechanicMetadata(template: BuilderTemplateSchemaType): MechanicMetadata {
  const meta = template.metadata as (MechanicMetadata & Record<string, unknown>) | undefined;
  return {
    mechanics: Array.isArray(meta?.mechanics) ? meta.mechanics : undefined,
    mechanicAssignments:
      meta?.mechanicAssignments && typeof meta.mechanicAssignments === 'object'
        ? meta.mechanicAssignments
        : undefined,
  };
}

export function getMechanics(template: BuilderTemplateSchemaType): Mechanic[] {
  return readMechanicMetadata(template).mechanics ?? [];
}

export function getMechanicAssignments(template: BuilderTemplateSchemaType): MechanicAssignments {
  return readMechanicMetadata(template).mechanicAssignments ?? {};
}

function writeMechanicMetadata(
  template: BuilderTemplateSchemaType,
  mechanics: Mechanic[],
  assignments: MechanicAssignments,
): BuilderTemplateSchemaType {
  const nextMetadata = {
    ...(template.metadata ?? {}),
    mechanics,
    mechanicAssignments: assignments,
  };
  return { ...template, metadata: nextMetadata } as BuilderTemplateSchemaType;
}

function isLibraryEligible(item: FieldItem): boolean {
  if (item.type !== 'checkbox')
    return false;
  if (!item.group)
    return false;
  return !isSharedField(item as { standard?: boolean; shared_field_key?: string });
}

/**
 * Idempotent: if the template already has a populated mechanic library, returns
 * the template untouched. Otherwise derives mechanics from existing checkbox
 * items by bucketing on case-insensitive trimmed label, links every item via
 * `mechanicAssignments`, and stages the result on the template draft.
 *
 * Shared fields and non-checkbox fields are not touched.
 */
export function migrateMechanicLibrary(template: BuilderTemplateSchemaType): BuilderTemplateSchemaType {
  const existing = readMechanicMetadata(template);
  if (existing.mechanics && existing.mechanics.length > 0) {
    return template;
  }

  const buckets = new Map<string, { mechanic: Mechanic; itemIds: string[] }>();

  for (const item of template.items) {
    if (!isLibraryEligible(item))
      continue;
    const bucketKey = (item.label ?? '').trim().toLowerCase();
    if (!bucketKey)
      continue;

    const found = buckets.get(bucketKey);
    if (found) {
      found.itemIds.push(item.id);
    } else {
      buckets.set(bucketKey, {
        mechanic: {
          id: createMechanicId(),
          label: item.label,
          ...(item.description ? { description: item.description } : {}),
        },
        itemIds: [item.id],
      });
    }
  }

  const mechanics: Mechanic[] = [];
  const assignments: MechanicAssignments = { ...(existing.mechanicAssignments ?? {}) };

  for (const { mechanic, itemIds } of buckets.values()) {
    mechanics.push(mechanic);
    for (const itemId of itemIds) {
      assignments[itemId] = mechanic.id;
    }
  }

  if (mechanics.length === 0 && Object.keys(assignments).length === 0) {
    // Nothing to migrate — keep template untouched so we don't dirty the draft.
    return template;
  }

  return writeMechanicMetadata(template, mechanics, assignments);
}

export function addMechanic(
  template: BuilderTemplateSchemaType,
  label = 'New mechanic',
): { template: BuilderTemplateSchemaType; mechanic: Mechanic } {
  const mechanic: Mechanic = { id: createMechanicId(), label };
  const mechanics = [...getMechanics(template), mechanic];
  return {
    template: writeMechanicMetadata(template, mechanics, getMechanicAssignments(template)),
    mechanic,
  };
}

export function renameMechanic(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
  nextLabel: string,
): BuilderTemplateSchemaType {
  const mechanics = getMechanics(template).map((m) =>
    m.id === mechanicId ? { ...m, label: nextLabel } : m,
  );
  const assignments = getMechanicAssignments(template);
  const nextItems = template.items.map((item) =>
    assignments[item.id] === mechanicId ? { ...item, label: nextLabel } : item,
  );
  return writeMechanicMetadata({ ...template, items: nextItems }, mechanics, assignments);
}

export function setMechanicDescription(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
  description: string,
): BuilderTemplateSchemaType {
  const mechanics = getMechanics(template).map((m) =>
    m.id === mechanicId
      ? { ...m, ...(description ? { description } : { description: undefined }) }
      : m,
  );
  return writeMechanicMetadata(template, mechanics, getMechanicAssignments(template));
}

export function deleteMechanic(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
): BuilderTemplateSchemaType {
  const assignments = getMechanicAssignments(template);
  const droppedItemIds = new Set(
    Object.entries(assignments)
      .filter(([, id]) => id === mechanicId)
      .map(([itemId]) => itemId),
  );

  const nextItems = template.items.filter((item) => !droppedItemIds.has(item.id));
  const nextAssignments: MechanicAssignments = {};
  for (const [itemId, id] of Object.entries(assignments)) {
    if (id !== mechanicId && !droppedItemIds.has(itemId)) {
      nextAssignments[itemId] = id;
    }
  }
  const nextMechanics = getMechanics(template).filter((m) => m.id !== mechanicId);
  return writeMechanicMetadata({ ...template, items: nextItems }, nextMechanics, nextAssignments);
}

export function assignMechanicToLoop(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
  loopId: string,
): BuilderTemplateSchemaType {
  const mechanic = getMechanics(template).find((m) => m.id === mechanicId);
  if (!mechanic)
    return template;

  const assignments = getMechanicAssignments(template);
  const alreadyAssigned = template.items.some(
    (item) => item.group === loopId && assignments[item.id] === mechanicId,
  );
  if (alreadyAssigned)
    return template;

  const newField: FieldItem = {
    ...createTextFieldForTemplate(template, loopId),
    key: createCheckboxKey(),
    type: 'checkbox',
    label: mechanic.label,
    ...(mechanic.description ? { description: mechanic.description } : {}),
  };

  const nextAssignments = { ...assignments, [newField.id]: mechanicId };
  const nextItems = [...template.items, newField];
  return writeMechanicMetadata({ ...template, items: nextItems }, getMechanics(template), nextAssignments);
}

export function unassignMechanicFromLoop(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
  loopId: string,
): BuilderTemplateSchemaType {
  const assignments = getMechanicAssignments(template);
  const targetId = template.items.find(
    (item) => item.group === loopId && assignments[item.id] === mechanicId,
  )?.id;
  if (!targetId)
    return template;

  const nextItems = template.items.filter((item) => item.id !== targetId);
  const nextAssignments: MechanicAssignments = {};
  for (const [itemId, id] of Object.entries(assignments)) {
    if (itemId !== targetId) {
      nextAssignments[itemId] = id;
    }
  }
  return writeMechanicMetadata({ ...template, items: nextItems }, getMechanics(template), nextAssignments);
}

export function cloneLoopWithMechanics(
  template: BuilderTemplateSchemaType,
  sourceLoopId: string,
): { template: BuilderTemplateSchemaType; newLoop: LoopMetadata } {
  const loops = buildLoopMetadataFromTemplate(template);
  const sourceLoop = loops.find((l) => l.id === sourceLoopId);
  if (!sourceLoop) {
    return { template, newLoop: { id: sourceLoopId, name: '', durationMin: DEFAULT_LOOP_DURATION_MIN } };
  }

  const newLoop = createNextLoop(loops);
  const nextLoops = [...loops];
  const insertAt = loops.findIndex((l) => l.id === sourceLoopId) + 1;
  nextLoops.splice(insertAt, 0, { ...newLoop, name: `${sourceLoop.name} (copy)`, durationMin: sourceLoop.durationMin });

  const assignments = getMechanicAssignments(template);
  const newAssignments: MechanicAssignments = { ...assignments };
  const clonedItems: FieldItem[] = [];

  for (const item of template.items) {
    if (item.group !== sourceLoopId)
      continue;
    const cloned: FieldItem = {
      ...createTextFieldForTemplate(template, newLoop.id),
      key: createUniqueCopiedKey(item.key, new Set(template.items.map((i) => i.key).concat(clonedItems.map((i) => i.key)))),
      type: item.type,
      label: item.label,
      required: item.required ?? true,
      ...(item.description ? { description: item.description } : {}),
    } as FieldItem;
    clonedItems.push(cloned);
    if (assignments[item.id]) {
      newAssignments[cloned.id] = assignments[item.id];
    }
  }

  const sourceLastIndex = template.items.reduce(
    (last, item, idx) => (item.group === sourceLoopId ? idx : last),
    -1,
  );
  const splicePoint = sourceLastIndex === -1 ? template.items.length : sourceLastIndex + 1;
  const nextItems = [...template.items];
  nextItems.splice(splicePoint, 0, ...clonedItems);

  return {
    template: writeMechanicMetadata(
      { ...template, items: nextItems, metadata: { ...(template.metadata ?? {}), loops: nextLoops } } as BuilderTemplateSchemaType,
      getMechanics(template),
      newAssignments,
    ),
    newLoop,
  };
}

export function deleteLoop(
  template: BuilderTemplateSchemaType,
  loopId: string,
): BuilderTemplateSchemaType {
  const loops = buildLoopMetadataFromTemplate(template);
  const nextLoops = loops.filter((l) => l.id !== loopId);

  const droppedItemIds = new Set(
    template.items.filter((item) => item.group === loopId).map((item) => item.id),
  );
  const nextItems = template.items.filter((item) => !droppedItemIds.has(item.id));

  const assignments = getMechanicAssignments(template);
  const nextAssignments: MechanicAssignments = {};
  for (const [itemId, id] of Object.entries(assignments)) {
    if (!droppedItemIds.has(itemId)) {
      nextAssignments[itemId] = id;
    }
  }

  return writeMechanicMetadata(
    { ...template, items: nextItems, metadata: { ...(template.metadata ?? {}), loops: nextLoops } } as BuilderTemplateSchemaType,
    getMechanics(template),
    nextAssignments,
  );
}

export function renameLoop(
  template: BuilderTemplateSchemaType,
  loopId: string,
  nextName: string,
): BuilderTemplateSchemaType {
  const loops = buildLoopMetadataFromTemplate(template);
  const nextLoops = loops.map((l) => (l.id === loopId ? { ...l, name: nextName } : l));
  return {
    ...template,
    metadata: { ...(template.metadata ?? {}), loops: nextLoops },
  } as BuilderTemplateSchemaType;
}

export function appendLoop(
  template: BuilderTemplateSchemaType,
): { template: BuilderTemplateSchemaType; loop: LoopMetadata } {
  const loops = buildLoopMetadataFromTemplate(template);
  const loop = createNextLoop(loops);
  const nextLoops = [...loops, loop];
  return {
    template: {
      ...template,
      metadata: { ...(template.metadata ?? {}), loops: nextLoops },
    } as BuilderTemplateSchemaType,
    loop,
  };
}

/**
 * Returns the ids of mechanics whose `label` no longer matches every linked
 * item's `label` (i.e. a Cards-view edit drifted from the library).
 */
export function detectMechanicDrift(template: BuilderTemplateSchemaType): Set<string> {
  const mechanics = getMechanics(template);
  const assignments = getMechanicAssignments(template);
  const drifted = new Set<string>();
  const labelByMechanic = new Map(mechanics.map((m) => [m.id, m.label]));

  for (const item of template.items) {
    const mechanicId = assignments[item.id];
    if (!mechanicId)
      continue;
    const expectedLabel = labelByMechanic.get(mechanicId);
    if (expectedLabel != null && expectedLabel !== item.label) {
      drifted.add(mechanicId);
    }
  }
  return drifted;
}

export function resyncMechanicFromItems(
  template: BuilderTemplateSchemaType,
  mechanicId: string,
): BuilderTemplateSchemaType {
  const assignments = getMechanicAssignments(template);
  const firstLinkedItem = template.items.find((item) => assignments[item.id] === mechanicId);
  if (!firstLinkedItem)
    return template;
  return renameMechanic(template, mechanicId, firstLinkedItem.label);
}
