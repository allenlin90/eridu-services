import 'dotenv/config';

import { Pool } from 'pg';

/**
 * Derivation backfill: project performance metrics from EXISTING submitted
 * tasks onto `ShowPlatform`, for shows whose submissions predate the
 * per-platform hydration framework (i.e. content is show-scoped / per-loop,
 * not `<field>:platform:<uid>` hydrated keys).
 *
 * This is distinct from `backfill-performance.ts` (which expects hydrated
 * keys). It exists to populate real data so `/performance` can be tested.
 *
 * Sources (precedence high → low):
 *   1. Post_production_check  — authoritative per-show GMV/View/CTR/CTO fields
 *   2. Moderator loop-8       — per-loop gmv_l#, views_l#, ctr_l#, cto_l#
 *
 * Derivation rules (loop-8 → one show-level value):
 *   - GMV          = max loop value   (gmv_l* is cumulative → max == final total)
 *   - viewer_count = peak (max) concurrent viewers across loops, rounded to int
 *   - CTR / CTO    = last non-empty loop value (end-of-show rate)   [CONFIRM rule]
 *
 * Attribution:
 *   - 1-platform shows → assign to the single platform (unambiguous)
 *   - 2-platform (or 0) shows → SKIP (flagged); needs manual per-platform entry
 *
 * Column guards mirror the production extractor: decimals rounded to scale and
 * range-checked; viewer_count coerced to a valid Int4 (non-integers rounded).
 */

const POST_PRODUCTION_TEMPLATE_UID = 'ttpl_n6f7qAZQmPA4He6MOR-y';

// Loop-8 performance content keys (env-agnostic: this is the template field-key
// convention, not a per-environment numeric id). Used to select only tasks that
// actually carry derivable metrics, so the script behaves identically across
// local and production where template *IDs* differ.
const LOOP_METRIC_PREFIXES = ['gmv', 'views', 'ctr', 'cto'] as const;
const LOOP_PERF_KEYS: string[] = LOOP_METRIC_PREFIXES.flatMap((prefix) =>
  Array.from({ length: 8 }, (_, i) => `${prefix}_l${i + 1}`),
);

const INT4_MAX = 2_147_483_647;

type Source = 'post' | 'loop8';

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '')
    return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function loopNums(content: Record<string, unknown>, prefix: string): number[] {
  const out: number[] = [];
  for (let n = 1; n <= 8; n++) {
    const v = num(content[`${prefix}_l${n}`]);
    if (v !== null)
      out.push(v);
  }
  return out;
}

function lastLoop(content: Record<string, unknown>, prefix: string): number | null {
  for (let n = 8; n >= 1; n--) {
    const v = num(content[`${prefix}_l${n}`]);
    if (v !== null)
      return v;
  }
  return null;
}

// Returns a fixed-scale decimal string, or undefined if out of column range.
function decimalToColumn(value: number | null, scale: number, intDigits: number): string | null | undefined {
  if (value === null)
    return null;
  const rounded = Number(value.toFixed(scale));
  if (Math.abs(rounded) >= 10 ** intDigits)
    return undefined;
  return rounded.toFixed(scale);
}

function viewerToColumn(value: number | null): number | null | undefined {
  if (value === null)
    return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > INT4_MAX)
    return undefined;
  return rounded;
}

type MetricKey = 'gmv' | 'viewerCount' | 'ctr' | 'cto';
const FACT_KEY: Record<MetricKey, string> = {
  gmv: 'show_platform_gmv',
  viewerCount: 'show_platform_view_count',
  ctr: 'show_platform_ctr',
  cto: 'show_platform_cto',
};

type Cell = { value: string | number; source: Source; tpl: string };
type PlatformAcc = {
  id: string;
  metadata: Record<string, any>;
  metrics: Partial<Record<MetricKey, Cell>>;
  changed: boolean;
};

// post (rank 2) beats loop8 (rank 1); same source → later task wins (asc order).
const RANK: Record<Source, number> = { post: 2, loop8: 1 };

function consider(acc: PlatformAcc, key: MetricKey, value: string | number, source: Source, tpl: string) {
  const cur = acc.metrics[key];
  if (cur && RANK[cur.source] > RANK[source])
    return; // existing higher-priority source wins
  acc.metrics[key] = { value, source, tpl };
  acc.changed = true;
}

export type BackfillResult = {
  tasksConsidered: number;
  platformsWritten: number;
  skippedMultiPlatform: number;
  skippedNoData: number;
  skippedOutOfRange: number;
};

export async function runDerivationBackfill(
  pool: Pool,
  { dryRun, logger = console.log }: { dryRun: boolean; logger?: (m: string) => void },
): Promise<BackfillResult> {
  logger('--- Show Performance Derivation Backfill (from existing submissions) ---');
  logger(dryRun ? 'DRY-RUN: no writes.' : 'APPLY: writing to ShowPlatform.');

  // Resolve Post_production_check field ids (by label) per snapshot version.
  const postSnaps = await pool.query(
    `select s.id, s.schema from task_template_snapshots s
       join task_templates t on t.id = s.template_id
      where t.uid = $1`,
    [POST_PRODUCTION_TEMPLATE_UID],
  );
  const postFieldsBySnapshot = new Map<string, Partial<Record<MetricKey, string>>>();
  for (const row of postSnaps.rows) {
    const map: Partial<Record<MetricKey, string>> = {};
    for (const item of (row.schema?.items ?? []) as any[]) {
      const label = String(item.label ?? '').trim().toLowerCase();
      if (label === 'gmv')
        map.gmv = item.id;
      else if (label === 'view' || label === 'views')
        map.viewerCount = item.id;
      else if (label === 'ctr')
        map.ctr = item.id;
      else if (label === 'cto')
        map.cto = item.id;
    }
    postFieldsBySnapshot.set(String(row.id), map);
  }

  const { rows } = await pool.query(
    `select t.id, t.completed_at, t.snapshot_id, tt.uid as template_uid, t.content, x.show_id,
            (select coalesce(json_agg(json_build_object(
                'id', sp.id::text, 'gmv', sp.gmv, 'viewer_count', sp.viewer_count,
                'ctr', sp.ctr, 'cto', sp.cto, 'metadata', sp.metadata)), '[]'::json)
               from show_platforms sp where sp.show_id = x.show_id and sp.deleted_at is null) as platforms
       from tasks t
       join task_targets x on x.task_id = t.id and x.target_type = 'SHOW' and x.deleted_at is null
       left join task_templates tt on tt.id = t.template_id
      where t.status in ('COMPLETED','REVIEW') and t.deleted_at is null
        and (tt.uid = $1 or t.content ?| $2::text[])
      order by t.completed_at asc nulls first`,
    [POST_PRODUCTION_TEMPLATE_UID, LOOP_PERF_KEYS],
  );

  const acc = new Map<string, PlatformAcc>();
  let tasksConsidered = 0;
  let skippedMultiPlatform = 0;
  let skippedNoData = 0;
  let skippedOutOfRange = 0;

  for (const task of rows) {
    const content = (task.content as Record<string, unknown> | null) ?? {};
    const templateUid: string | null = task.template_uid;
    const isPost = templateUid === POST_PRODUCTION_TEMPLATE_UID;

    // Derive raw show-level values per metric.
    const raw: Partial<Record<MetricKey, number>> = {};
    if (isPost) {
      const fields = postFieldsBySnapshot.get(String(task.snapshot_id)) ?? {};
      raw.gmv = fields.gmv ? num(content[fields.gmv]) ?? undefined : undefined;
      raw.viewerCount = fields.viewerCount ? num(content[fields.viewerCount]) ?? undefined : undefined;
      raw.ctr = fields.ctr ? num(content[fields.ctr]) ?? undefined : undefined;
      raw.cto = fields.cto ? num(content[fields.cto]) ?? undefined : undefined;
    } else {
      const gmvLoops = loopNums(content, 'gmv');
      const viewLoops = loopNums(content, 'views');
      raw.gmv = gmvLoops.length ? Math.max(...gmvLoops) : undefined;
      raw.viewerCount = viewLoops.length ? Math.max(...viewLoops) : undefined;
      raw.ctr = lastLoop(content, 'ctr') ?? undefined;
      raw.cto = lastLoop(content, 'cto') ?? undefined;
    }
    const hasAny = Object.values(raw).some((v) => v !== undefined && v !== null);
    if (!hasAny) {
      skippedNoData++;
      continue;
    }

    const platforms = task.platforms as any[];
    if (platforms.length !== 1) {
      skippedMultiPlatform++;
      continue;
    }
    tasksConsidered++;
    const source: Source = isPost ? 'post' : 'loop8';
    const tpl = templateUid ?? '';

    const dbp = platforms[0];
    const pid = String(dbp.id);
    if (!acc.has(pid)) {
      // Seed from current DB state so prior provenance (esp. post-production) is respected.
      const meta = (dbp.metadata as Record<string, any> | null) ?? {};
      const provenance = meta.performance_templates ?? {};
      const seed: PlatformAcc = { id: pid, metadata: meta, metrics: {}, changed: false };
      const seedMetric = (key: MetricKey, val: any) => {
        if (val === null || val === undefined)
          return;
        const recTpl = provenance[FACT_KEY[key]];
        if (recTpl === undefined)
          return;
        seed.metrics[key] = {
          value: key === 'viewerCount' ? Number(val) : String(val),
          source: recTpl === POST_PRODUCTION_TEMPLATE_UID ? 'post' : 'loop8',
          tpl: recTpl,
        };
      };
      seedMetric('gmv', dbp.gmv);
      seedMetric('viewerCount', dbp.viewer_count);
      seedMetric('ctr', dbp.ctr);
      seedMetric('cto', dbp.cto);
      acc.set(pid, seed);
    }
    const platform = acc.get(pid)!;

    for (const key of ['gmv', 'ctr', 'cto'] as const) {
      if (raw[key] === undefined || raw[key] === null)
        continue;
      const scale = 2;
      const intDigits = key === 'gmv' ? 10 : 3; // gmv Decimal(12,2); ctr/cto Decimal(5,2)
      const col = decimalToColumn(raw[key]!, scale, intDigits);
      if (col === undefined) { skippedOutOfRange++; continue; }
      consider(platform, key, col as string, source, tpl);
    }
    if (raw.viewerCount !== undefined && raw.viewerCount !== null) {
      const col = viewerToColumn(raw.viewerCount);
      if (col === undefined)
        skippedOutOfRange++;
      else consider(platform, 'viewerCount', col as number, source, tpl);
    }
  }

  // Write each changed platform once.
  let platformsWritten = 0;
  for (const platform of acc.values()) {
    if (!platform.changed)
      continue;
    const m = platform.metrics;
    const provenance = { ...(platform.metadata.performance_templates ?? {}) };
    for (const key of ['gmv', 'viewerCount', 'ctr', 'cto'] as const) {
      if (m[key])
        provenance[FACT_KEY[key]] = m[key]!.tpl;
    }
    const nextMeta = { ...platform.metadata, performance_templates: provenance };
    platformsWritten++;
    if (!dryRun) {
      await pool.query(
        `update show_platforms set
            gmv = coalesce($1, gmv),
            viewer_count = coalesce($2, viewer_count),
            ctr = coalesce($3, ctr),
            cto = coalesce($4, cto),
            metadata = $5,
            updated_at = now()
          where id = $6`,
        [
          m.gmv ? (m.gmv.value as string) : null,
          m.viewerCount ? (m.viewerCount.value as number) : null,
          m.ctr ? (m.ctr.value as string) : null,
          m.cto ? (m.cto.value as string) : null,
          JSON.stringify(nextMeta),
          platform.id,
        ],
      );
    }
  }

  const result: BackfillResult = {
    tasksConsidered,
    platformsWritten,
    skippedMultiPlatform,
    skippedNoData,
    skippedOutOfRange,
  };
  logger('--- Summary ---');
  logger(`Tasks with derivable metrics (1-platform): ${result.tasksConsidered}`);
  logger(`ShowPlatform rows ${dryRun ? 'that would be written' : 'written'}: ${result.platformsWritten}`);
  logger(`Skipped (multi/0-platform shows): ${result.skippedMultiPlatform}`);
  logger(`Skipped (no derivable metrics): ${result.skippedNoData}`);
  logger(`Skipped (value out of column range): ${result.skippedOutOfRange}`);
  return result;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error('DATABASE_URL is not defined');
  const pool = new Pool({ connectionString });
  try {
    await runDerivationBackfill(pool, { dryRun });
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes('backfill-performance-from-submissions')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
