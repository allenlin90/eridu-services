import { TASK_TEMPLATE_FIELD_ID_PATTERN } from './task-schema-engine.js';
import {
  type FieldItemV2,
  SYSTEM_FACT_KEY_DEFINITIONS,
  type SystemFactKey,
  type UiSchemaV2,
} from './template-definition.schema.js';

export const HYDRATED_KEY_SEPARATOR = '__';
const FIELD_ID_PART = /^fld_[a-z0-9]{10,}$/;
const UID_PART = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export type HydrationScope = 'creator' | 'platform';

export type HydrationTarget = {
  uid: string;
  label: string;
};

export type HydrationContext = {
  creators: HydrationTarget[];
  platforms: HydrationTarget[];
};

export type HydratedFieldItem = FieldItemV2 & {
  source_field_id: string;
  binding_target?: {
    system_fact_key: SystemFactKey;
    scope: HydrationScope;
    target_uid: string;
    target_label: string;
  };
  binding_stale?: boolean;
};

export type HydratedUiSchemaV2 = UiSchemaV2 & { items: HydratedFieldItem[] };

export function buildHydratedContentKey(
  fieldId: string,
  scope: HydrationScope,
  targetUid: string,
): string {
  return `${fieldId}${HYDRATED_KEY_SEPARATOR}${scope}${HYDRATED_KEY_SEPARATOR}${targetUid}`;
}

export function parseHydratedContentKey(
  key: string,
): { fieldId: string; scope: HydrationScope; targetUid: string } | null {
  const parts = key.split(HYDRATED_KEY_SEPARATOR);
  if (parts.length !== 3) {
    return null;
  }
  const [fieldId, scope, targetUid] = parts as [string, string, string];
  if (!FIELD_ID_PART.test(fieldId)) {
    return null;
  }
  if (scope !== 'creator' && scope !== 'platform') {
    return null;
  }
  if (!UID_PART.test(targetUid)) {
    return null;
  }
  return { fieldId, scope, targetUid };
}

export function isHydratedContentKey(key: string): boolean {
  return parseHydratedContentKey(key) !== null;
}

function getHydrationScope(systemFactKey: SystemFactKey): HydrationScope | 'show' {
  const target = SYSTEM_FACT_KEY_DEFINITIONS[systemFactKey].target;
  if (target === 'show_creator') {
    return 'creator';
  }
  if (target === 'show_platform') {
    return 'platform';
  }
  return 'show';
}

function makeHydratedItem(
  source: FieldItemV2,
  scope: HydrationScope,
  target: HydrationTarget,
  options: { stale: boolean },
): HydratedFieldItem {
  const systemFactKey = source.system_fact_key!;
  const hydratedId = buildHydratedContentKey(source.id, scope, target.uid);
  // Stale items carry preserved values for review but are skipped at
  // extraction and not user-editable. Drop required + require_reason so the
  // operator can submit without resolving validation on an unassigned target.
  const validation = options.stale && source.validation
    ? (() => {
        const { require_reason: _omit, ...rest } = source.validation;
        return Object.keys(rest).length > 0 ? rest : undefined;
      })()
    : source.validation;
  return {
    ...source,
    id: hydratedId,
    key: hydratedId,
    label: `${source.label} — ${target.label}`,
    required: options.stale ? false : source.required,
    validation,
    source_field_id: source.id,
    system_fact_key: undefined,
    binding_target: {
      system_fact_key: systemFactKey,
      scope,
      target_uid: target.uid,
      target_label: target.label,
    },
    binding_stale: options.stale ? true : undefined,
  };
}

/**
 * Expand a v2 template schema's `system_fact_key` bindings into one input per
 * currently-assigned creator / platform. Existing values for targets that are
 * no longer assigned are surfaced as `binding_stale: true` items so the
 * operator can see them dimmed without losing in-progress data. Stale items
 * are skipped at extraction (PR 12.0.5).
 *
 * Keys are deterministic: `<fieldId>__<scope>__<targetUid>` so the same target
 * always lands on the same content key across re-hydrations.
 */
export function hydrateTaskFormSchema(
  schema: UiSchemaV2,
  context: HydrationContext,
  content: Record<string, unknown> = {},
): HydratedUiSchemaV2 {
  const creatorUids = new Set(context.creators.map((t) => t.uid));
  const platformUids = new Set(context.platforms.map((t) => t.uid));
  const items: HydratedFieldItem[] = [];

  for (const item of schema.items) {
    const systemFactKey = item.system_fact_key;
    if (!systemFactKey) {
      items.push({ ...item, source_field_id: item.id });
      continue;
    }

    const scope = getHydrationScope(systemFactKey);
    if (scope === 'show') {
      items.push({ ...item, source_field_id: item.id });
      continue;
    }

    const activeTargets = scope === 'creator' ? context.creators : context.platforms;
    const activeUids = scope === 'creator' ? creatorUids : platformUids;

    for (const target of activeTargets) {
      items.push(makeHydratedItem(item, scope, target, { stale: false }));
    }

    const seenStaleUids = new Set<string>();
    for (const contentKey of Object.keys(content)) {
      const parsed = parseHydratedContentKey(contentKey);
      if (!parsed)
        continue;
      if (parsed.fieldId !== item.id)
        continue;
      if (parsed.scope !== scope)
        continue;
      if (activeUids.has(parsed.targetUid))
        continue;
      if (seenStaleUids.has(parsed.targetUid))
        continue;
      seenStaleUids.add(parsed.targetUid);
      items.push(
        makeHydratedItem(
          item,
          scope,
          { uid: parsed.targetUid, label: parsed.targetUid },
          { stale: true },
        ),
      );
    }
  }

  return { ...schema, items };
}

export function isFieldIdLike(value: string): boolean {
  return TASK_TEMPLATE_FIELD_ID_PATTERN.test(value);
}
