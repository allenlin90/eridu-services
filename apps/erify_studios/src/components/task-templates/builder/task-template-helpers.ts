import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';

import type { BuilderTemplateSchemaType, FieldItem, LoopMetadata } from './schema';

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
