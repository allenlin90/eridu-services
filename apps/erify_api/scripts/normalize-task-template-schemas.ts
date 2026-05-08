import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import {
  createTaskTemplateFieldId,
  getSchemaEngine,
  safeParseTemplateSchema,
} from '@eridu/api-types/task-management';

import { getNormalizationExitCode } from './normalize-task-template-rollout-gate';

type Mode = 'validate-only' | 'current-to-v2' | 'cleanup-legacy-shared-fields';

type Args = {
  mode: Mode;
  dryRun: boolean;
  apply: boolean;
};

type SharedFieldEntry = {
  key: string;
  type: string;
  category?: string;
  label?: string;
  description?: string;
  is_active?: boolean;
};

type SchemaEnvelope = Record<string, unknown> & {
  items?: unknown;
  metadata?: Record<string, unknown> | null;
};

type FieldItem = Record<string, unknown> & {
  id?: string;
  key: string;
  type: string;
  group?: string;
  standard?: boolean;
  shared_field_key?: string;
};

type CanonicalizationDecision =
  | { canonicalize: true; sharedKey: string }
  | { canonicalize: false; sharedKey: string; reason: string };

type StudioSharedFields = Map<string, SharedFieldEntry>;

type TemplateActionPlan = {
  templateUid: string;
  studioUid: string;
  templateName: string;
  alreadyV2: boolean;
  currentVersion: number;
  nextVersion: number;
  fieldRewrites: number;
  canonicalizedFamilies: string[];
  preservedSuffixedFamilies: string[];
  manualReviewItems: string[];
  errors: string[];
};

const SUFFIX_PATTERN = /^(?<base>[a-z][a-z0-9_]*?)_l[0-9]+$/;
const LOOP_ID_PATTERN = /^l\d+$/;
const FIELD_ID_PATTERN = /^fld_[a-z0-9]{10,}$/;

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let mode: Mode | null = null;
  let dryRun = false;
  let apply = false;

  for (const arg of argv) {
    if (arg === '--validate-only') {
      mode = 'validate-only';
    }
    else if (arg === '--current-to-v2') {
      mode = 'current-to-v2';
    }
    else if (arg === '--cleanup-legacy-shared-fields') {
      mode = 'cleanup-legacy-shared-fields';
    }
    else if (arg === '--dry-run') {
      dryRun = true;
    }
    else if (arg === '--apply') {
      apply = true;
    }
  }

  if (!mode) {
    throw new Error('One of --validate-only, --current-to-v2, --cleanup-legacy-shared-fields is required.');
  }
  if ((mode === 'current-to-v2' || mode === 'cleanup-legacy-shared-fields') && !dryRun && !apply) {
    throw new Error(`--${mode} requires either --dry-run or --apply.`);
  }
  if (apply && dryRun) {
    throw new Error('--apply and --dry-run are mutually exclusive.');
  }

  return { mode, dryRun, apply };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getSharedFieldsForStudio(studioMetadata: unknown): StudioSharedFields {
  const map: StudioSharedFields = new Map();
  if (!isObject(studioMetadata)) {
    return map;
  }
  const sharedFields = (studioMetadata as { shared_fields?: unknown }).shared_fields;
  if (!Array.isArray(sharedFields)) {
    return map;
  }
  for (const entry of sharedFields) {
    if (!isObject(entry)) {
      continue;
    }
    const key = entry.key;
    const type = entry.type;
    if (typeof key !== 'string' || typeof type !== 'string') {
      continue;
    }
    map.set(key, {
      key,
      type,
      category: typeof entry.category === 'string' ? entry.category : undefined,
      label: typeof entry.label === 'string' ? entry.label : undefined,
      description: typeof entry.description === 'string' ? entry.description : undefined,
      is_active: typeof entry.is_active === 'boolean' ? entry.is_active : true,
    });
  }
  return map;
}

function titleCaseFromSnake(snakeKey: string): string {
  return snakeKey
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveCanonicalLabel(variants: SharedFieldEntry[], baseKey: string): string {
  // Try to strip a "(Loop N)" suffix from any variant's label.
  for (const variant of variants) {
    const label = variant.label;
    if (!label) {
      continue;
    }
    const stripped = label.replace(/\s*\(\s*Loop\s*\d+\s*\)\s*$/i, '').trim();
    if (stripped.length > 0 && stripped !== label) {
      return stripped;
    }
  }
  // Fallback: titlecase the base key (`ads_cost` → "Ads Cost").
  return titleCaseFromSnake(baseKey);
}

type CanonicalBaseAddition = {
  baseKey: string;
  type: string;
  category?: string;
  label: string;
  description?: string;
  sourceVariants: string[];
};

/**
 * Inspect a studio's existing shared-fields registry and derive canonical base
 * entries to add when a `<base>_l<N>` family is fully consistent (same type +
 * same category) and the base itself isn't already registered. Returns
 * additions; does not mutate the input map.
 */
function deriveCanonicalBasesToAdd(sharedFields: StudioSharedFields): CanonicalBaseAddition[] {
  const familyMap = new Map<string, SharedFieldEntry[]>();
  for (const entry of sharedFields.values()) {
    const match = SUFFIX_PATTERN.exec(entry.key);
    if (!match || !match.groups?.base) {
      continue;
    }
    const variants = familyMap.get(match.groups.base) ?? [];
    variants.push(entry);
    familyMap.set(match.groups.base, variants);
  }

  const additions: CanonicalBaseAddition[] = [];
  for (const [base, variants] of familyMap.entries()) {
    if (sharedFields.has(base)) {
      continue;
    }
    const types = new Set(variants.map((v) => v.type));
    const categoryTokens = new Set(variants.map((v) => v.category ?? '__null__'));
    if (types.size !== 1 || categoryTokens.size !== 1) {
      continue;
    }
    const type = [...types][0];
    const categoryToken = [...categoryTokens][0];
    const category = categoryToken === '__null__' ? undefined : categoryToken;
    additions.push({
      baseKey: base,
      type,
      category,
      label: deriveCanonicalLabel(variants, base),
      description: variants[0]?.description?.replace(/\s*\(\s*Loop\s*\d+\s*\)\s*$/i, '').trim() || undefined,
      sourceVariants: variants.map((v) => v.key).sort(),
    });
  }
  return additions.sort((a, b) => a.baseKey.localeCompare(b.baseKey));
}

function applyCanonicalBasesToMap(
  sharedFields: StudioSharedFields,
  additions: CanonicalBaseAddition[],
): void {
  for (const addition of additions) {
    sharedFields.set(addition.baseKey, {
      key: addition.baseKey,
      type: addition.type,
      category: addition.category,
      label: addition.label,
      description: addition.description,
      is_active: true,
    });
  }
}

type LegacyCleanupPlan = {
  studioUid: string;
  removed: string[];
  retainedSuffixed: { key: string; reason: string }[];
};

/**
 * Build the next studio metadata with suffixed `<base>_l<N>` shared-field
 * entries removed. An entry is eligible for removal when its canonical
 * `<base>` is also present in the registry AND no active v2 template
 * references the suffixed key as `shared_field_key`.
 */
function planLegacySharedFieldsCleanup(
  studioUid: string,
  studioMetadata: unknown,
  v2SharedFieldKeyReferences: Set<string>,
): { plan: LegacyCleanupPlan; nextMetadata: Record<string, unknown> } {
  const baseObj: Record<string, unknown> = isObject(studioMetadata) ? { ...studioMetadata } : {};
  const existing = Array.isArray(baseObj.shared_fields) ? [...baseObj.shared_fields] : [];

  const presentKeys = new Set<string>();
  for (const entry of existing) {
    if (isObject(entry) && typeof entry.key === 'string') {
      presentKeys.add(entry.key);
    }
  }

  const removed: string[] = [];
  const retainedSuffixed: { key: string; reason: string }[] = [];
  const retained: unknown[] = [];

  for (const entry of existing) {
    if (!isObject(entry) || typeof entry.key !== 'string') {
      retained.push(entry);
      continue;
    }
    const match = SUFFIX_PATTERN.exec(entry.key);
    if (!match || !match.groups?.base) {
      retained.push(entry);
      continue;
    }
    const base = match.groups.base;
    if (!presentKeys.has(base)) {
      retained.push(entry);
      retainedSuffixed.push({ key: entry.key, reason: `canonical base "${base}" not registered` });
      continue;
    }
    if (v2SharedFieldKeyReferences.has(entry.key)) {
      retained.push(entry);
      retainedSuffixed.push({ key: entry.key, reason: 'still referenced by an active v2 template' });
      continue;
    }
    removed.push(entry.key);
  }

  retained.sort((a, b) => {
    const ak = isObject(a) && typeof a.key === 'string' ? a.key : '';
    const bk = isObject(b) && typeof b.key === 'string' ? b.key : '';
    return ak.localeCompare(bk);
  });
  baseObj.shared_fields = retained;

  return {
    plan: { studioUid, removed: removed.sort(), retainedSuffixed },
    nextMetadata: baseObj,
  };
}

function collectV2SharedFieldKeyReferences(
  templates: { currentSchema: unknown }[],
): Set<string> {
  const refs = new Set<string>();
  for (const t of templates) {
    const schema = t.currentSchema as SchemaEnvelope;
    let engine: 'task_template_v1' | 'task_template_v2' | null = null;
    try {
      engine = getSchemaEngine(schema);
    }
    catch {
      engine = null;
    }
    if (engine !== 'task_template_v2') {
      continue;
    }
    const items = Array.isArray(schema.items) ? (schema.items as FieldItem[]) : [];
    for (const item of items) {
      if (typeof item.shared_field_key === 'string' && item.shared_field_key.length > 0) {
        refs.add(item.shared_field_key);
      }
    }
  }
  return refs;
}

function buildUpdatedStudioMetadata(
  studioMetadata: unknown,
  additions: CanonicalBaseAddition[],
): Record<string, unknown> {
  const baseObj: Record<string, unknown> = isObject(studioMetadata) ? { ...studioMetadata } : {};
  const existing = Array.isArray(baseObj.shared_fields) ? [...baseObj.shared_fields] : [];
  const existingKeys = new Set<string>();
  for (const entry of existing) {
    if (isObject(entry) && typeof entry.key === 'string') {
      existingKeys.add(entry.key);
    }
  }
  const merged: unknown[] = [...existing];
  for (const addition of additions) {
    if (existingKeys.has(addition.baseKey)) {
      continue;
    }
    merged.push({
      key: addition.baseKey,
      type: addition.type,
      ...(addition.category ? { category: addition.category } : {}),
      label: addition.label,
      ...(addition.description ? { description: addition.description } : {}),
      is_active: true,
    });
  }
  merged.sort((a, b) => {
    const ak = isObject(a) && typeof a.key === 'string' ? a.key : '';
    const bk = isObject(b) && typeof b.key === 'string' ? b.key : '';
    return ak.localeCompare(bk);
  });
  baseObj.shared_fields = merged;
  return baseObj;
}

function decideCanonicalization(
  field: FieldItem,
  sharedFields: StudioSharedFields,
): CanonicalizationDecision {
  const originalKey = field.key;
  if (!field.standard || typeof originalKey !== 'string') {
    return { canonicalize: false, sharedKey: originalKey, reason: 'not a v1 standard field' };
  }

  const match = SUFFIX_PATTERN.exec(originalKey);
  if (!match || !match.groups?.base) {
    return { canonicalize: false, sharedKey: originalKey, reason: 'no _lN suffix to canonicalize' };
  }

  const base = match.groups.base;
  const baseEntry = sharedFields.get(base);
  if (!baseEntry) {
    return { canonicalize: false, sharedKey: originalKey, reason: `base shared field "${base}" not registered` };
  }
  if (baseEntry.type !== field.type) {
    return { canonicalize: false, sharedKey: originalKey, reason: `base shared field "${base}" type mismatch` };
  }

  return { canonicalize: true, sharedKey: base };
}

type UpgradedSchemaResult = {
  schema: SchemaEnvelope;
  plan: Pick<TemplateActionPlan, 'fieldRewrites' | 'canonicalizedFamilies' | 'preservedSuffixedFamilies' | 'manualReviewItems' | 'errors'>;
};

function upgradeSchemaToV2(
  schema: SchemaEnvelope,
  sharedFields: StudioSharedFields,
): UpgradedSchemaResult {
  const errors: string[] = [];
  const manualReviewItems: string[] = [];
  const canonicalizedFamilies = new Set<string>();
  const preservedSuffixedFamilies = new Set<string>();

  if (!Array.isArray(schema.items)) {
    errors.push('schema.items is not an array');
    return {
      schema,
      plan: {
        fieldRewrites: 0,
        canonicalizedFamilies: [],
        preservedSuffixedFamilies: [],
        manualReviewItems,
        errors,
      },
    };
  }

  const items = schema.items as FieldItem[];

  // Pre-compute decisions and detect (sharedKey, group) collisions before applying canonicalization.
  const collisionKeyToOriginals = new Map<string, string[]>();
  for (const item of items) {
    const decision = decideCanonicalization(item, sharedFields);
    if (!decision.canonicalize) {
      continue;
    }
    const groupSegment = typeof item.group === 'string' && item.group.length > 0 ? item.group : 'none';
    const collisionKey = `${decision.sharedKey}::${groupSegment}`;
    const arr = collisionKeyToOriginals.get(collisionKey) ?? [];
    arr.push(item.key);
    collisionKeyToOriginals.set(collisionKey, arr);
  }

  const collidingPairs = new Set<string>();
  for (const [pair, originals] of collisionKeyToOriginals.entries()) {
    if (originals.length > 1) {
      collidingPairs.add(pair);
      manualReviewItems.push(
        `Canonicalization skipped for (${pair}): collision among keys [${originals.join(', ')}]. Resolve manually.`,
      );
    }
  }

  let fieldRewrites = 0;
  const newItems: FieldItem[] = items.map((item) => {
    const next: FieldItem = { ...item };

    const existingId = next.id;
    if (typeof existingId !== 'string' || !FIELD_ID_PATTERN.test(existingId)) {
      next.id = createTaskTemplateFieldId();
      fieldRewrites += 1;
    }

    const decision = decideCanonicalization(item, sharedFields);
    if (item.standard) {
      const groupSegment = typeof item.group === 'string' && item.group.length > 0 ? item.group : 'none';
      const collisionKey = `${decision.sharedKey}::${groupSegment}`;
      const isColliding = collidingPairs.has(collisionKey);

      if (decision.canonicalize && !isColliding) {
        next.shared_field_key = decision.sharedKey;
        // Canonicalize the editor handle too — `key` becomes the base so the
        // builder shows `ads_cost` (with `group: l3`) instead of `ads_cost_l3`.
        // v2's per-(group, key) uniqueness still holds because each loop
        // contains at most one field per shared family.
        next.key = decision.sharedKey;
        canonicalizedFamilies.add(decision.sharedKey);
      }
      else {
        next.shared_field_key = item.key;
        if (SUFFIX_PATTERN.test(item.key)) {
          preservedSuffixedFamilies.add(item.key);
        }
      }
    }
    delete next.standard;

    return next;
  });

  const newSchema: SchemaEnvelope = {
    ...schema,
    schema_version: 2,
    schema_engine: 'task_template_v2',
    content_key_strategy: 'field_id',
    report_projection_strategy: 'descriptor',
    items: newItems,
  };

  return {
    schema: newSchema,
    plan: {
      fieldRewrites,
      canonicalizedFamilies: [...canonicalizedFamilies].sort(),
      preservedSuffixedFamilies: [...preservedSuffixedFamilies].sort(),
      manualReviewItems,
      errors,
    },
  };
}

function assertValidLoopIds(schema: SchemaEnvelope): string[] {
  const errors: string[] = [];
  const metadata = isObject(schema.metadata) ? schema.metadata : null;
  if (!metadata) {
    return errors;
  }
  const loops = (metadata as { loops?: unknown }).loops;
  if (!Array.isArray(loops)) {
    return errors;
  }
  for (const [index, loop] of loops.entries()) {
    if (!isObject(loop)) {
      errors.push(`metadata.loops[${index}] is not an object`);
      continue;
    }
    const id = (loop as { id?: unknown }).id;
    if (typeof id !== 'string' || !LOOP_ID_PATTERN.test(id)) {
      errors.push(`metadata.loops[${index}].id="${String(id)}" does not match /^l\\d+$/`);
    }
  }
  return errors;
}

function postUpgradeSelfCheck(schema: SchemaEnvelope): string[] {
  const errors: string[] = [];
  const items = Array.isArray(schema.items) ? (schema.items as FieldItem[]) : [];
  for (const item of items) {
    if (typeof item.id !== 'string' || !FIELD_ID_PATTERN.test(item.id)) {
      errors.push(`field "${item.key}" has invalid id "${String(item.id)}"`);
    }
    if (item.standard !== undefined) {
      errors.push(`field "${item.key}" still has "standard"`);
    }
  }
  errors.push(...assertValidLoopIds(schema));

  const parsed = safeParseTemplateSchema(schema);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`zod: ${issue.path.join('.')} ${issue.message}`);
    }
  }
  return errors;
}

function printSummaryAndSetExitCode(summary: { invalid: number }): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ summary }));
  process.exitCode = getNormalizationExitCode(summary);
}

async function main() {
  const args = parseArgs();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const summary = {
    inspected: 0,
    alreadyV2: 0,
    invalid: 0,
    plannedUpgrades: 0,
    applied: 0,
    snapshotsCreated: 0,
    studiosWithBasesAdded: 0,
    canonicalBasesAdded: 0,
    studiosCleaned: 0,
    legacyEntriesRemoved: 0,
  };

  try {
    const templates = await prisma.taskTemplate.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        uid: true,
        studioId: true,
        name: true,
        version: true,
        currentSchema: true,
        studio: { select: { id: true, uid: true, metadata: true } },
      },
      orderBy: { id: 'asc' },
    });

    if (args.mode === 'cleanup-legacy-shared-fields') {
      // Cleanup mode is independent of the v1→v2 upgrade pipeline. It removes
      // suffixed `<base>_l<N>` entries from `studio.metadata.shared_fields[]`
      // when the canonical base is registered and no active v2 template
      // references the suffixed key as `shared_field_key`. Idempotent.
      const studioRows = new Map<string, { studio: (typeof templates)[number]['studio']; templates: typeof templates }>();
      for (const t of templates) {
        const key = t.studio.uid;
        const group = studioRows.get(key) ?? { studio: t.studio, templates: [] };
        group.templates.push(t);
        studioRows.set(key, group);
      }

      for (const [studioUid, group] of studioRows.entries()) {
        const refs = collectV2SharedFieldKeyReferences(group.templates);
        const { plan, nextMetadata } = planLegacySharedFieldsCleanup(studioUid, group.studio.metadata, refs);

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
          studio: studioUid,
          legacy_cleanup: {
            removed_count: plan.removed.length,
            removed: plan.removed,
            retained_suffixed: plan.retainedSuffixed,
          },
          action: args.apply ? 'cleanup-applied' : 'cleanup-planned',
        }));

        if (args.apply && plan.removed.length > 0) {
          await prisma.studio.update({
            where: { id: group.studio.id },
            data: { metadata: nextMetadata as never },
          });
          summary.studiosCleaned += 1;
          summary.legacyEntriesRemoved += plan.removed.length;
        }
      }

      printSummaryAndSetExitCode(summary);
      return;
    }

    // Group by studio so we can do the per-studio canonical-base pre-pass once
    // (deriving + writing the registry update) before iterating that studio's
    // templates.
    type TemplateRow = (typeof templates)[number];
    const studioGroups = new Map<string, { studio: TemplateRow['studio']; templates: TemplateRow[] }>();
    for (const t of templates) {
      const key = t.studio.uid;
      const group = studioGroups.get(key) ?? { studio: t.studio, templates: [] };
      group.templates.push(t);
      studioGroups.set(key, group);
    }

    const sharedFieldsByStudioUid = new Map<string, StudioSharedFields>();

    for (const [studioUid, group] of studioGroups.entries()) {
      const sharedFields = getSharedFieldsForStudio(group.studio.metadata);
      const basesToAdd = deriveCanonicalBasesToAdd(sharedFields);

      if (basesToAdd.length > 0) {
        // Augment the in-memory map so per-template canonicalization sees the new
        // bases. This is a no-op write contract whether we apply or not — the
        // upgrade decisions are computed against the post-pre-pass map either way.
        applyCanonicalBasesToMap(sharedFields, basesToAdd);

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
          studio: studioUid,
          canonical_bases_to_add: basesToAdd.map((b) => ({
            key: b.baseKey,
            type: b.type,
            category: b.category,
            label: b.label,
            from_variants: b.sourceVariants,
          })),
          action: args.apply ? 'studio-bases-applied' : 'studio-bases-planned',
        }));

        if (args.apply) {
          const nextMetadata = buildUpdatedStudioMetadata(group.studio.metadata, basesToAdd);
          await prisma.studio.update({
            where: { id: group.studio.id },
            data: { metadata: nextMetadata as never },
          });
          summary.studiosWithBasesAdded += 1;
          summary.canonicalBasesAdded += basesToAdd.length;
        }
      }

      sharedFieldsByStudioUid.set(studioUid, sharedFields);
    }

    for (const t of templates) {
      summary.inspected += 1;
      const studioUid = t.studio.uid;
      const sharedFields = sharedFieldsByStudioUid.get(studioUid) ?? getSharedFieldsForStudio(t.studio.metadata);
      const currentSchema = (t.currentSchema as SchemaEnvelope) ?? {};
      let engine: 'task_template_v1' | 'task_template_v2' | null = null;
      try {
        engine = getSchemaEngine(currentSchema);
      }
      catch {
        engine = null;
      }

      const plan: TemplateActionPlan = {
        templateUid: t.uid,
        studioUid,
        templateName: t.name,
        alreadyV2: engine === 'task_template_v2',
        currentVersion: t.version,
        nextVersion: t.version + 1,
        fieldRewrites: 0,
        canonicalizedFamilies: [],
        preservedSuffixedFamilies: [],
        manualReviewItems: [],
        errors: [],
      };

      if (args.mode === 'validate-only') {
        if (engine === null) {
          summary.invalid += 1;
          plan.errors.push('Unsupported or unknown engine');
        }
        else if (engine === 'task_template_v2') {
          summary.alreadyV2 += 1;
          const issues = postUpgradeSelfCheck(currentSchema);
          if (issues.length > 0) {
            summary.invalid += 1;
            plan.errors.push(...issues);
          }
        }
        else {
          const parsed = safeParseTemplateSchema(currentSchema);
          if (!parsed.success) {
            summary.invalid += 1;
            for (const issue of parsed.error.issues) {
              plan.errors.push(`zod: ${issue.path.join('.')} ${issue.message}`);
            }
          }
          plan.errors.push(...assertValidLoopIds(currentSchema));
          const preview = upgradeSchemaToV2(currentSchema, sharedFields);
          plan.canonicalizedFamilies = preview.plan.canonicalizedFamilies;
          plan.preservedSuffixedFamilies = preview.plan.preservedSuffixedFamilies;
          plan.manualReviewItems = preview.plan.manualReviewItems;
        }
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ template: plan }));
        continue;
      }

      if (engine === null) {
        summary.invalid += 1;
        plan.errors.push('Unsupported or unknown engine; skipping.');
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ template: plan }));
        continue;
      }

      if (engine === 'task_template_v2') {
        summary.alreadyV2 += 1;
        plan.errors = postUpgradeSelfCheck(currentSchema);
        if (plan.errors.length > 0) {
          summary.invalid += 1;
        }
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ template: plan, action: 'skip-already-v2' }));
        continue;
      }

      const { schema: nextSchema, plan: upgradePlan } = upgradeSchemaToV2(currentSchema, sharedFields);
      plan.fieldRewrites = upgradePlan.fieldRewrites;
      plan.canonicalizedFamilies = upgradePlan.canonicalizedFamilies;
      plan.preservedSuffixedFamilies = upgradePlan.preservedSuffixedFamilies;
      plan.manualReviewItems = upgradePlan.manualReviewItems;
      plan.errors.push(...upgradePlan.errors);

      const checkErrors = postUpgradeSelfCheck(nextSchema);
      if (checkErrors.length > 0) {
        plan.errors.push(...checkErrors);
        summary.invalid += 1;
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ template: plan, action: 'self-check-failed' }));
        continue;
      }

      summary.plannedUpgrades += 1;

      if (args.dryRun) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ template: plan, action: 'plan-upgrade' }));
        continue;
      }

      const newVersion = t.version + 1;
      await prisma.$transaction(async (tx) => {
        await tx.taskTemplate.update({
          where: { id: t.id },
          data: {
            currentSchema: nextSchema as never,
            version: newVersion,
          },
        });
        await tx.taskTemplateSnapshot.create({
          data: {
            templateId: t.id,
            version: newVersion,
            schema: nextSchema as never,
          },
        });
      });

      summary.applied += 1;
      summary.snapshotsCreated += 1;
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ template: plan, action: 'applied' }));
    }

    printSummaryAndSetExitCode(summary);
  }
  finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
