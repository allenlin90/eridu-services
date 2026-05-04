import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import {
  createTaskTemplateFieldId,
  getSchemaEngine,
  safeParseTemplateSchema,
} from '@eridu/api-types/task-management';

type Mode = 'validate-only' | 'current-to-v2';

type Args = {
  mode: Mode;
  dryRun: boolean;
  apply: boolean;
};

type SharedFieldEntry = {
  key: string;
  type: string;
  category?: string;
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
    else if (arg === '--dry-run') {
      dryRun = true;
    }
    else if (arg === '--apply') {
      apply = true;
    }
  }

  if (!mode) {
    throw new Error('One of --validate-only or --current-to-v2 is required.');
  }
  if (mode === 'current-to-v2' && !dryRun && !apply) {
    throw new Error('--current-to-v2 requires either --dry-run or --apply.');
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
      is_active: typeof entry.is_active === 'boolean' ? entry.is_active : true,
    });
  }
  return map;
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
        studio: { select: { uid: true, metadata: true } },
      },
      orderBy: { id: 'asc' },
    });

    for (const t of templates) {
      summary.inspected += 1;
      const studioUid = t.studio.uid;
      const sharedFields = getSharedFieldsForStudio(t.studio.metadata);
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

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ summary }));
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
