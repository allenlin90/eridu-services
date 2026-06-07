import 'dotenv/config';
import { Pool } from 'pg';

/**
 * Track A — bind the Post_production_check template's performance fields to the
 * `show_platform_*` system fact keys (platform scope), so future submissions
 * hydrate one input per platform and auto-extract onto `ShowPlatform` through
 * the existing pipeline — removing the need for the Track-B derivation backfill
 * on new shows.
 *
 * Mirrors `TaskTemplateService.updateTemplateWithSnapshot`: edits the live
 * `current_schema`, bumps `version`, and writes a matching `task_template_snapshots`
 * row at the new version, under an optimistic version guard. Only NEW tasks
 * generated from the new version pick up the bindings (existing snapshots are
 * immutable).
 *
 * The four target fields are number-typed and compatible with the number-typed
 * fact keys; platform scope is derived from `target: 'show_platform'` by the
 * hydration framework, so no scope flag is stored on the field.
 *
 * Dry-run by default; pass --apply to write.
 */

const POST_PRODUCTION_TEMPLATE_UID = 'ttpl_n6f7qAZQmPA4He6MOR-y';

// Map a field's label (case-insensitive, trimmed) → the fact key to bind.
const LABEL_TO_FACT_KEY: Record<string, string> = {
  gmv: 'show_platform_gmv',
  view: 'show_platform_view_count',
  views: 'show_platform_view_count',
  ctr: 'show_platform_ctr',
  cto: 'show_platform_cto',
};

type SchemaItem = {
  id: string;
  label?: string;
  type?: string;
  system_fact_key?: string;
  [k: string]: unknown;
};

export async function runBinding(
  pool: Pool,
  { dryRun, logger = console.log }: { dryRun: boolean; logger?: (m: string) => void },
): Promise<{ bound: number; alreadyBound: number; newVersion: number | null }> {
  logger('--- Track A: bind Post_production_check performance fact keys ---');
  logger(dryRun ? 'DRY-RUN: no writes.' : 'APPLY: writing a new template version.');

  // `current_schema` collides with the Postgres `current_schema()` builtin — it
  // MUST be double-quoted everywhere or the column read silently returns 'public'.
  const res = await pool.query(
    'select id, studio_id, version, "current_schema" as schema from task_templates where uid = $1 and deleted_at is null',
    [POST_PRODUCTION_TEMPLATE_UID],
  );
  if (res.rowCount === 0) throw new Error(`Post_production_check template (${POST_PRODUCTION_TEMPLATE_UID}) not found`);
  const row = res.rows[0];
  const schema = typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema;
  const items: SchemaItem[] = schema.items ?? [];
  if (!Array.isArray(items) || items.length === 0) throw new Error('Template current_schema has no items');

  // Guard: a fact key may be bound by at most one field (matches validateSchema).
  const boundKeys = new Set(items.map((i) => i.system_fact_key).filter(Boolean) as string[]);

  let bound = 0;
  let alreadyBound = 0;
  for (const item of items) {
    const factKey = LABEL_TO_FACT_KEY[String(item.label ?? '').trim().toLowerCase()];
    if (!factKey) continue;

    if (item.system_fact_key === factKey) {
      alreadyBound++;
      logger(`= ${item.label} (${item.id}) already bound to ${factKey}`);
      continue;
    }
    if (item.system_fact_key) {
      throw new Error(`Field ${item.label} (${item.id}) already bound to a different key: ${item.system_fact_key}`);
    }
    if (item.type !== 'number') {
      throw new Error(`Field ${item.label} (${item.id}) is type "${item.type}", expected "number" for ${factKey}`);
    }
    if (boundKeys.has(factKey)) {
      throw new Error(`Fact key ${factKey} is already bound by another field in this template`);
    }

    item.system_fact_key = factKey;
    boundKeys.add(factKey);
    bound++;
    logger(`${dryRun ? '[dry-run] would bind' : '+ binding'} ${item.label} (${item.id}) → ${factKey}`);
  }

  if (bound === 0) {
    logger(`Nothing to bind (already bound: ${alreadyBound}).`);
    return { bound: 0, alreadyBound, newVersion: null };
  }

  const newVersion = (row.version ?? 1) + 1;
  if (!dryRun) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      // Optimistic version guard mirrors updateWithVersionCheck.
      const upd = await client.query(
        'update task_templates set "current_schema" = $1, version = $2, updated_at = now() where id = $3 and version = $4',
        [JSON.stringify(schema), newVersion, row.id, row.version],
      );
      if (upd.rowCount === 0) {
        throw new Error(`Version conflict: template ${row.id} is no longer at version ${row.version}. Re-run.`);
      }
      await client.query(
        'insert into task_template_snapshots(template_id, version, schema, metadata, created_at) values($1, $2, $3, $4, now())',
        [row.id, newVersion, JSON.stringify(schema), '{}'],
      );
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  }

  logger('--- Summary ---');
  logger(`Fields ${dryRun ? 'that would be bound' : 'bound'}: ${bound}`);
  logger(`Already bound: ${alreadyBound}`);
  logger(`Template version: ${row.version} → ${dryRun ? `${newVersion} (not written)` : newVersion}`);
  return { bound, alreadyBound, newVersion: dryRun ? null : newVersion };
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not defined');
  const pool = new Pool({ connectionString });
  try {
    await runBinding(pool, { dryRun });
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes('bind-post-production-performance-facts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
