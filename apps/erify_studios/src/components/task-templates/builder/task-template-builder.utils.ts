import { createTaskTemplateFieldId, getSchemaEngine, type SharedField } from '@eridu/api-types/task-management';

import type { BuilderTemplateSchemaType, FieldItem, LoopMetadata } from './schema';

/** Default per-loop duration applied to new/normalized loops without an explicit value. */
export const DEFAULT_LOOP_DURATION_MIN = 15;
/** Stable empty array so a missing `sharedFields` prop keeps a referentially stable default. */
export const EMPTY_SHARED_FIELDS: SharedField[] = [];

/**
 * Resolves the loop list for a template: prefers `metadata.loops` (normalized,
 * with a positive duration) and backfills any `item.group` values that lack a
 * metadata entry so legacy/group-only templates still surface every loop.
 */
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
  const fallbackGroups = Array.from(new Set(template.items.map((item) => item.group).filter((group): group is string => !!group)));

  for (const group of fallbackGroups) {
    if (!knownIds.has(group)) {
      normalizedFromMetadata.push({
        id: group,
        name: group,
        durationMin: DEFAULT_LOOP_DURATION_MIN,
      });
    }
  }

  return normalizedFromMetadata;
}

/** Drops the `loops` key from template metadata, returning undefined when nothing else remains. */
export function omitLoopsFromMetadata(metadata: BuilderTemplateSchemaType['metadata']): BuilderTemplateSchemaType['metadata'] | undefined {
  if (!metadata) {
    return undefined;
  }

  const { loops: _ignored, ...rest } = metadata;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/** Builds the next `l{n}` loop, skipping ids already in use. */
export function createNextLoop(existingLoops: LoopMetadata[]): LoopMetadata {
  const existingIds = new Set(existingLoops.map((loop) => loop.id));
  let ordinal = existingLoops.length + 1;
  let id = `l${ordinal}`;

  while (existingIds.has(id)) {
    ordinal += 1;
    id = `l${ordinal}`;
  }

  return {
    id,
    name: `Loop ${ordinal}`,
    durationMin: DEFAULT_LOOP_DURATION_MIN,
  };
}

/** Derives a unique `_copy`-suffixed key (50-char capped) for a cloned field. */
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

/**
 * Picks the key for an inserted shared field: prefers the canonical shared key,
 * falling back to a loop-scoped (`{key}_{loopId}`) then numeric-suffixed variant
 * only when the canonical key is already taken. Mutates `usedKeys`.
 */
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

/** Builds a default text field, using engine-appropriate id generation (v2 `fld_` vs uuid). */
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

/**
 * Strips a trailing `_{sourceGroup}` suffix from a cloned v2 value so the
 * canonical base is what gets re-grouped — descriptor projection then attaches
 * the new loop suffix correctly instead of producing a broken double-suffix.
 */
export function stripSourceLoopSuffix(value: string | undefined, sourceGroup: string | undefined): string | undefined {
  if (!value || !sourceGroup) {
    return value;
  }
  const suffix = `_${sourceGroup}`;
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

/** Formats a minute total as a human "N hrs M mins" duration label. */
export function formatTotalLoopDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} min${minutes > 1 ? 's' : ''}`;
}
