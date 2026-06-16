import type { Prisma } from '@prisma/client';

/**
 * Canonical per-show rollup of the stored `ShowPlatform` performance facts.
 *
 * This is the single source of truth for "collapse a show's per-platform
 * performance into one row": GMV and views SUM across platforms, CTR and CTO
 * AVERAGE across the platforms that recorded them. Every read path that needs a
 * show-level performance number — the studio-performance read model and the
 * task-report export — aggregates through here so the two can never drift.
 *
 * Reads the *extracted* columns (the operational fact), never `task.content`
 * (the operator input). Pass only the live, non-deleted platforms for the show;
 * stale / soft-deleted targets must be filtered out by the caller's query so
 * their lingering values never enter the rollup.
 */
export type ShowPlatformPerformanceFacts = {
  gmv: Prisma.Decimal | null;
  /** Postgres `Int` column, defaults to 0 — only meaningful when a fact was recorded. */
  viewerCount: number;
  ctr: Prisma.Decimal | null;
  cto: Prisma.Decimal | null;
  /** `ShowPlatform.metadata` JSONB; used to tell "0 recorded" from "never recorded". */
  metadata: unknown;
};

export type ShowPerformanceAggregate = {
  gmv: Prisma.Decimal | null;
  views: number | null;
  ctr: Prisma.Decimal | null;
  cto: Prisma.Decimal | null;
};

/**
 * `viewerCount` is a non-nullable column that defaults to 0, so a platform that
 * never recorded a view count is indistinguishable from one that recorded 0 by
 * the column alone. The extractor stamps `metadata.performance_templates
 * .show_platform_view_count` when it writes the fact, so its presence is the
 * "was actually recorded" marker — mirroring the studio-performance summary.
 */
export function showPlatformHasViewCount(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }
  const templates = (metadata as { performance_templates?: unknown }).performance_templates;
  if (!templates || typeof templates !== 'object') {
    return false;
  }
  return 'show_platform_view_count' in (templates as Record<string, unknown>);
}

export function aggregateShowPlatformPerformance(
  platforms: ShowPlatformPerformanceFacts[],
): ShowPerformanceAggregate {
  let gmv: Prisma.Decimal | null = null;
  let views: number | null = null;

  let ctrSum: Prisma.Decimal | null = null;
  let ctrCount = 0;
  let ctoSum: Prisma.Decimal | null = null;
  let ctoCount = 0;

  for (const platform of platforms) {
    if (platform.gmv !== null) {
      gmv = gmv ? gmv.add(platform.gmv) : platform.gmv;
    }

    if (showPlatformHasViewCount(platform.metadata)) {
      views = (views ?? 0) + platform.viewerCount;
    }

    if (platform.ctr !== null) {
      ctrSum = ctrSum ? ctrSum.add(platform.ctr) : platform.ctr;
      ctrCount++;
    }

    if (platform.cto !== null) {
      ctoSum = ctoSum ? ctoSum.add(platform.cto) : platform.cto;
      ctoCount++;
    }
  }

  return {
    gmv,
    views,
    ctr: ctrSum && ctrCount > 0 ? ctrSum.div(ctrCount) : null,
    cto: ctoSum && ctoCount > 0 ? ctoSum.div(ctoCount) : null,
  };
}
