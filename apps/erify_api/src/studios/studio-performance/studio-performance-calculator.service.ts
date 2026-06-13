import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  PerformanceSortField,
  PerformanceSortRule,
  ShowPerformanceLoopItem,
  ShowPerformanceResponse,
} from '@eridu/api-types/performance';

import type {
  SnapshotFieldItem,
  SnapshotLoop,
  TaskContent,
} from './schemas/moderator-snapshot.schema';
import {
  parseModeratorSnapshot,
  parseTaskContent,
} from './schemas/moderator-snapshot.schema';
import { parsePerformanceTemplates } from './schemas/show-platform-metadata.schema';
import type { PerformanceListShow } from './studio-performance.repository';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';

/** A primitive sort key: numeric, a Prisma Decimal, or `null` (sorted last). */
type SortValue = number | Prisma.Decimal | null;

/**
 * Pure metric / loop-derivation logic for the studio-performance feature.
 * Stateless and dependency-free, but modelled as an injectable provider to stay
 * consistent with the codebase's DI-first service layering for domain logic
 * (mirrors StudioCostCalculatorService).
 */
@Injectable()
export class StudioPerformanceCalculatorService {
  /** Fallback loop length (minutes) when a loop omits its own duration. */
  private static readonly DEFAULT_LOOP_DURATION_MIN = 15;

  /** Maps a show row (with relations) to its performance response shape. */
  mapShowToPerformance(show: PerformanceListShow): ShowPerformanceResponse {
    return {
      id: show.uid,
      name: show.name,
      start_time: show.startTime.toISOString(),
      end_time: show.endTime.toISOString(),
      client_name: show.client?.name ?? null,
      show_type_name: show.showType?.name ?? null,
      platforms: show.showPlatforms.map((sp) => {
        const templates = parsePerformanceTemplates(sp.metadata);
        const hasViewCount = templates.show_platform_view_count !== undefined;

        return {
          show_platform_uid: sp.uid,
          platform_id: sp.platform.uid,
          platform_name: sp.platform.name,
          gmv: decimalToString(sp.gmv),
          views: hasViewCount ? sp.viewerCount : null,
          ctr: decimalToString(sp.ctr),
          cto: decimalToString(sp.cto),
        };
      }),
    };
  }

  /**
   * Takes the already-validated sort rules (parsed and field-checked by the
   * `performanceSortSchema` at the request boundary) and appends `start_time
   * desc` as the final tie-breaker when absent, so ordering is deterministic
   * regardless of the requested keys.
   */
  withSortTieBreaker(rules: PerformanceSortRule[] | undefined): PerformanceSortRule[] {
    const result = rules ? [...rules] : [];
    if (!result.some((rule) => rule.field === 'start_time')) {
      result.push({ field: 'start_time', desc: true });
    }
    return result;
  }

  /**
   * Resolves a show's sort key for a given field by aggregating across its
   * platforms (sum for GMV/Views, average for the CTR/CTO rates). Returns `null`
   * when no platform carries the metric, so it sorts to the end.
   */
  calculateShowSortValue(item: ShowPerformanceResponse, field: PerformanceSortField): SortValue {
    if (field === 'start_time') {
      return new Date(item.start_time).getTime();
    }

    if (field === 'gmv') {
      let sum: Prisma.Decimal | null = null;
      for (const p of item.platforms) {
        if (p.gmv !== null) {
          // Defensive: skip values that aren't valid decimals rather than throw.
          try {
            const d = new Prisma.Decimal(p.gmv);
            sum = sum ? sum.add(d) : d;
          } catch {}
        }
      }
      return sum;
    }

    if (field === 'views') {
      let sum: number | null = null;
      for (const p of item.platforms) {
        if (p.views !== null) {
          sum = (sum ?? 0) + p.views;
        }
      }
      return sum;
    }

    if (field === 'ctr' || field === 'cto') {
      let sum: Prisma.Decimal | null = null;
      let count = 0;
      for (const p of item.platforms) {
        const raw = field === 'ctr' ? p.ctr : p.cto;
        if (raw !== null) {
          // Defensive: skip values that aren't valid decimals rather than throw.
          try {
            const d = new Prisma.Decimal(raw);
            sum = sum ? sum.add(d) : d;
            count++;
          } catch {}
        }
      }
      return sum && count > 0 ? sum.div(count) : null;
    }

    return null;
  }

  /** Compares two sort values for the given direction, ordering `null` last. */
  compareSortValues(a: SortValue, b: SortValue, desc: boolean): number {
    if (a === null && b === null)
      return 0;
    if (a === null)
      return 1;
    if (b === null)
      return -1;

    const valA = a instanceof Prisma.Decimal ? a.toNumber() : a;
    const valB = b instanceof Prisma.Decimal ? b.toNumber() : b;

    if (valA === valB)
      return 0;

    return desc ? valB - valA : valA - valB;
  }

  /**
   * Selects the authoritative loop-bearing task from a list ordered most-recent
   * first: the first task whose snapshot schema carries a `metadata.loops` array
   * ("latest wins"). Older finalized tasks are ignored — re-moderation
   * supersedes prior runs. Returns `null` when no task carries a loop schema.
   */
  selectLoopBearingTask(
    tasks: Array<{ snapshot?: { schema?: unknown } | null; content?: unknown }>,
  ): { content: TaskContent; items: SnapshotFieldItem[]; loops: SnapshotLoop[] } | null {
    for (const task of tasks) {
      const { items, loops } = parseModeratorSnapshot(task.snapshot?.schema);
      if (loops !== null) {
        return { content: parseTaskContent(task.content), items, loops };
      }
    }
    return null;
  }

  /**
   * Maps a selected task's loops + snapshot field items + content into per-loop,
   * per-platform metric rows. Shared by the single-show loops endpoint (which
   * returns the full breakdown) and the per-show series endpoint (which folds
   * these rows to a peak), so both read loop metrics through one implementation
   * and can't drift.
   */
  buildLoopItems(
    loops: SnapshotLoop[],
    items: SnapshotFieldItem[],
    content: TaskContent,
    showPlatforms: Array<{ uid: string; platform: { name: string } }>,
  ): ShowPerformanceLoopItem[] {
    // Field keys may be absent or non-string in legacy snapshots; lowercase
    // only real strings so matching never throws on, say, a numeric key.
    const lower = (value: unknown): string | undefined =>
      typeof value === 'string' ? value.toLowerCase() : undefined;

    return loops.map((loop) => {
      const loopFields = items.filter((item) => item.group === loop.id);

      let gmvFieldId: string | undefined;
      let viewFieldId: string | undefined;
      let ctrFieldId: string | undefined;
      let ctoFieldId: string | undefined;

      for (const item of loopFields) {
        const key = lower(item.key);
        const sharedKey = lower(item.shared_field_key);
        const factKey = item.system_fact_key;

        // Match a metric by its system fact key, shared field key, or field
        // key. Legacy moderator snapshots store loop fields without a
        // `shared_field_key` and with the loop suffixed onto the key (e.g.
        // `gmv_l1`, `views_l1`), so a `<token>_…` prefix is accepted too.
        // `loopFields` is already scoped to this loop's group, so a prefix
        // can't collide across loops.
        const matches = (factName: string, tokens: string[]): boolean => {
          if (factKey === factName) {
            return true;
          }
          return tokens.some(
            (token) => sharedKey === token || key === token || (key?.startsWith(`${token}_`) ?? false),
          );
        };

        if (matches('show_platform_gmv', ['gmv'])) {
          gmvFieldId = item.id;
        } else if (matches('show_platform_view_count', ['views', 'viewer_count', 'viewercount'])) {
          viewFieldId = item.id;
        } else if (matches('show_platform_ctr', ['ctr'])) {
          ctrFieldId = item.id;
        } else if (matches('show_platform_cto', ['cto'])) {
          ctoFieldId = item.id;
        }
      }

      const metrics = showPlatforms.map((sp) => {
        const getVal = (fieldId: string | undefined): unknown => {
          if (!fieldId)
            return null;
          const multicastKey = `${fieldId}:platform:${sp.uid}`;
          if (content[multicastKey] !== undefined && content[multicastKey] !== null) {
            return content[multicastKey];
          }
          return content[fieldId] ?? null;
        };

        const rawGmv = getVal(gmvFieldId);
        const rawViews = getVal(viewFieldId);
        const rawCtr = getVal(ctrFieldId);
        const rawCto = getVal(ctoFieldId);

        const formatDecimal = (val: unknown): string | null => {
          if (val === null || val === undefined || val === '')
            return null;
          try {
            const d = new Prisma.Decimal(val as Prisma.Decimal.Value);
            return decimalToString(d);
          } catch {
            return String(val);
          }
        };

        const formatInt = (val: unknown): number | null => {
          if (val === null || val === undefined || val === '')
            return null;
          const n = Math.round(Number(val));
          return Number.isFinite(n) ? n : null;
        };

        return {
          show_platform_uid: sp.uid,
          platform_name: sp.platform.name,
          gmv: formatDecimal(rawGmv),
          ctr: formatDecimal(rawCtr),
          cto: formatDecimal(rawCto),
          viewer_count: formatInt(rawViews),
        };
      });

      return {
        id: loop.id,
        name: loop.name,
        durationMin: Number(loop.durationMin) || StudioPerformanceCalculatorService.DEFAULT_LOOP_DURATION_MIN,
        metrics,
      };
    });
  }

  /**
   * Sums the stored per-platform GMV and view counts for a show. GMV sums every
   * non-null platform value; views only count platforms with a recorded
   * view-count fact (mirroring the summary/list semantics — `viewerCount`
   * defaults to 0, so an unrecorded platform must not inflate the total).
   * Returns `null` for a metric when no platform carries it.
   */
  sumShowStoredAggregates(
    showPlatforms: Array<{ gmv: Prisma.Decimal | null; viewerCount: number; metadata: unknown }>,
  ): { gmv: string | null; views: number | null } {
    let gmvSum: Prisma.Decimal | null = null;
    let viewsSum: number | null = null;

    for (const sp of showPlatforms) {
      if (sp.gmv !== null) {
        gmvSum = gmvSum ? gmvSum.add(sp.gmv) : sp.gmv;
      }

      const templates = parsePerformanceTemplates(sp.metadata);
      if (templates.show_platform_view_count !== undefined) {
        viewsSum = (viewsSum ?? 0) + sp.viewerCount;
      }
    }

    return {
      gmv: gmvSum !== null ? decimalToString(gmvSum) : null,
      views: viewsSum,
    };
  }

  /**
   * Reduces per-loop, per-platform metric rows to the single highest CTR / CTO
   * reached for the show — the "peak" across the entire stream. Returns `null`
   * for a metric when no loop/platform recorded it.
   */
  computePeakFromLoops(
    loops: ShowPerformanceLoopItem[],
  ): { peakCtr: string | null; peakCto: string | null } {
    let maxCtr: Prisma.Decimal | null = null;
    let maxCto: Prisma.Decimal | null = null;

    for (const loop of loops) {
      for (const metric of loop.metrics) {
        maxCtr = this.maxDecimal(maxCtr, metric.ctr);
        maxCto = this.maxDecimal(maxCto, metric.cto);
      }
    }

    return {
      peakCtr: maxCtr !== null ? decimalToString(maxCtr) : null,
      peakCto: maxCto !== null ? decimalToString(maxCto) : null,
    };
  }

  /**
   * Returns the larger of `current` and the decimal parsed from `raw`. A null or
   * unparseable `raw` leaves `current` unchanged, so malformed snapshot values
   * never poison the peak.
   */
  private maxDecimal(current: Prisma.Decimal | null, raw: string | null): Prisma.Decimal | null {
    if (raw === null) {
      return current;
    }
    let parsed: Prisma.Decimal;
    try {
      parsed = new Prisma.Decimal(raw);
    } catch {
      return current;
    }
    if (current === null) {
      return parsed;
    }
    return parsed.greaterThan(current) ? parsed : current;
  }
}
