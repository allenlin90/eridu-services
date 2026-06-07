import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  PerformanceQuery,
  PerformanceShowsQuery,
  PerformanceSortField,
  PerformanceSortRule,
  PerformanceSummaryResponse,
  ShowPerformanceLoopsResponse,
  ShowPerformanceResponse,
} from '@eridu/api-types/performance';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import { PrismaService } from '@/prisma/prisma.service';

/** A primitive sort key: numeric, a Prisma Decimal, or `null` (sorted last). */
type SortValue = number | Prisma.Decimal | null;

/** Show row shape returned by the performance-shows query (relations included). */
type ShowWithPerformanceRelations = Prisma.ShowGetPayload<{
  include: {
    client: true;
    showType: true;
    showPlatforms: { include: { platform: true } };
  };
}>;

@Injectable()
export class StudioPerformanceService {
  /** Maximum span (in days) a performance query is allowed to cover. */
  private static readonly MAX_DATE_RANGE_DAYS = 31;

  /** Locale/currency applied when a studio has no localization metadata. */
  private static readonly DEFAULT_LOCALE = 'th-TH';
  private static readonly DEFAULT_CURRENCY = 'THB';

  /** Fallback loop length (minutes) when a loop omits its own duration. */
  private static readonly DEFAULT_LOOP_DURATION_MIN = 15;

  /**
   * Task statuses whose snapshots are authoritative for loop-level metrics.
   * Fact extraction writes the show-level GMV/view aggregates on transition to
   * COMPLETED (see TaskOrchestrationService), so the loop breakdown must read
   * from the same finalized states — otherwise loop totals would diverge from
   * the show-level figures shown elsewhere on the dashboard. In-progress
   * statuses (incl. REVIEW) are intentionally excluded.
   */
  private static readonly LOOP_METRIC_TASK_STATUSES = ['COMPLETED', 'CLOSED'] as const;

  /**
   * The hour (in the studio's local "operational" timezone) at which a new
   * operational day begins. Mirrors the frontend's `OPERATIONAL_DAY_START_HOUR`
   * so a show at, say, 03:00 local is bucketed into the *previous* calendar day.
   */
  private static readonly OPERATIONAL_DAY_START_HOUR = 6;

  /**
   * Predicate matching a single `ShowPlatform` row that carries at least one
   * recorded performance fact (GMV, CTR, CTO, or a view-count template entry).
   * Shared by the presence filter and the summary aggregation so that "has a
   * record" means the same thing in the list filter and the trend totals.
   */
  private static readonly PERFORMANCE_RECORD_OR: Prisma.ShowPlatformWhereInput['OR'] = [
    { gmv: { not: null } },
    { ctr: { not: null } },
    { cto: { not: null } },
    {
      metadata: {
        path: ['performance_templates', 'show_platform_view_count'],
        not: Prisma.JsonNull,
      },
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes an optional single value or array into a flat array.
   * Returns an empty array when the value is absent.
   */
  private toArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  /**
   * Validates that the requested date range is ordered and does not exceed the
   * allowed span. A reversed range (end before start) is rejected so callers get
   * a 400 instead of a silently empty result set.
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('end_date must be on or after start_date');
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > StudioPerformanceService.MAX_DATE_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${StudioPerformanceService.MAX_DATE_RANGE_DAYS} days`,
      );
    }
  }

  /**
   * Derives the client's UTC offset (in ms) from the `start_date` query param.
   *
   * CONTRACT: the frontend always sends `start_date` at exactly the start of an
   * operational day — i.e. its local time-of-day is `OPERATIONAL_DAY_START_HOUR`
   * (06:00). We recover the offset from the gap between that fixed local hour and
   * the value's UTC time-of-day, which avoids threading an explicit timezone
   * param through the API. This is brittle by design: if the frontend ever sends
   * a `start_date` whose local time is not 06:00 the trend buckets shift. A
   * single offset is applied across the whole range (no DST handling), which is
   * correct for the fixed-offset locales we serve (e.g. Asia/Bangkok, UTC+7).
   */
  private deriveClientOffsetMs(startDate: Date): number {
    const utcTimeInMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
    const localTimeInMinutes = StudioPerformanceService.OPERATIONAL_DAY_START_HOUR * 60;
    let offsetInMinutes = localTimeInMinutes - utcTimeInMinutes;
    // Normalize into (-12h, +12h] so a value near the UTC day boundary doesn't
    // read as a ~±24h offset (e.g. UTC+7 sent as 23:00Z the previous day).
    if (offsetInMinutes > 720) {
      offsetInMinutes -= 1440;
    } else if (offsetInMinutes < -720) {
      offsetInMinutes += 1440;
    }
    return offsetInMinutes * 60 * 1000;
  }

  /**
   * Maps a UTC instant to its operational-day key (`YYYY-MM-DD`) in the client's
   * local timezone, where each operational day starts at
   * `OPERATIONAL_DAY_START_HOUR`. Shifting by the start hour before taking the
   * date portion means a show at 03:00 local lands in the prior day's bucket.
   */
  private toOperationalDayKey(instant: Date, offsetMs: number): string {
    const startHourMs = StudioPerformanceService.OPERATIONAL_DAY_START_HOUR * 60 * 60 * 1000;
    return new Date(instant.getTime() + offsetMs - startHourMs)
      .toISOString()
      .slice(0, 10);
  }

  /**
   * Builds the shared `Show` where clause scoping results to a studio, the
   * requested date range, and any optional client / show type / platform filters.
   */
  private buildShowWhere(
    studioUid: string,
    query: PerformanceQuery & Pick<PerformanceShowsQuery, 'name'>,
  ): Prisma.ShowWhereInput {
    const clientUids = this.toArray(query.client_id);
    const showTypeUids = this.toArray(query.show_type_id);
    const platformUids = this.toArray(query.platform_id);
    const showStandardUids = this.toArray(query.show_standard_id);
    // Trim so a whitespace-only search collapses to "no filter" rather than a
    // `contains: ' '` clause that matches every row with an interior space.
    const name = query.name?.trim();

    // Both the platform filter and the presence filter constrain the
    // `showPlatforms` relation, so they must be composed via `AND` — spreading
    // them as sibling keys would silently let the later one clobber the former.
    const andConditions: Prisma.ShowWhereInput[] = [];

    if (platformUids.length > 0) {
      andConditions.push({
        showPlatforms: {
          some: {
            deletedAt: null,
            platform: { uid: { in: platformUids } },
          },
        },
      });
    }

    // When a platform filter is active, the presence check must be scoped to
    // the same set of platforms — otherwise a show passes "With Records" because
    // a *different* platform has GMV/CTR/etc., even though the selected platform
    // row is empty. Narrowing the `some` predicate to `platformUids` keeps the
    // presence semantics consistent with what the user is actually filtering on.
    const recordedSome: Prisma.ShowWhereInput = {
      showPlatforms: {
        some: {
          deletedAt: null,
          ...(platformUids.length > 0
            ? { platform: { uid: { in: platformUids } } }
            : {}),
          OR: StudioPerformanceService.PERFORMANCE_RECORD_OR,
        },
      },
    };
    if (query.has_performance === 'true') {
      andConditions.push(recordedSome);
    } else if (query.has_performance === 'false') {
      andConditions.push({ NOT: recordedSome });
    }

    return {
      studio: { uid: studioUid },
      deletedAt: null,
      startTime: {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      },
      ...(clientUids.length > 0 ? { client: { uid: { in: clientUids } } } : {}),
      ...(showTypeUids.length > 0 ? { showType: { uid: { in: showTypeUids } } } : {}),
      ...(showStandardUids.length > 0 ? { showStandard: { uid: { in: showStandardUids } } } : {}),
      ...(name
        ? {
            name: {
              contains: name,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };
  }

  /**
   * Builds the where clause for the nested `showPlatforms` include, excluding
   * soft-deleted rows and narrowing to the requested platforms when filtered.
   */
  private buildShowPlatformsWhere(
    query: PerformanceQuery,
  ): Prisma.ShowPlatformWhereInput {
    const platformUids = this.toArray(query.platform_id);

    return {
      deletedAt: null,
      ...(platformUids.length > 0 ? { platform: { uid: { in: platformUids } } } : {}),
    };
  }

  /**
   * Resolves the display `locale`/`currency` from a studio's `metadata.localization`,
   * falling back to the platform defaults when either is absent.
   */
  private resolveLocalization(metadata: unknown): { locale: string; currency: string } {
    const localization = ((metadata as Record<string, any> | null)?.localization ?? {}) as Record<string, any>;
    return {
      locale: localization.locale ?? StudioPerformanceService.DEFAULT_LOCALE,
      currency: localization.currency ?? StudioPerformanceService.DEFAULT_CURRENCY,
    };
  }

  async getPerformanceSummary(
    studioUid: string,
    query: PerformanceQuery,
  ): Promise<PerformanceSummaryResponse> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    this.validateDateRange(startDate, endDate);

    const studio = await this.prisma.studio.findUnique({
      where: { uid: studioUid },
      select: { metadata: true },
    });
    const { locale, currency } = this.resolveLocalization(studio?.metadata);

    // The presence filter (`has_performance`) is a list-only concern. Applying
    // it here would make the summary self-referential — e.g. with
    // `has_performance=true` the "recorded vs total" card would always read
    // 100% — so the summary always aggregates the whole date-range population.
    const shows = await this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, { ...query, has_performance: undefined }),
      include: {
        showPlatforms: {
          where: this.buildShowPlatformsWhere(query),
          include: {
            platform: true,
          },
        },
      },
    });

    const totalShowsCount = shows.length;
    let recordedShowsCount = 0;

    let totalGmv = new Prisma.Decimal(0);
    let totalViews = 0;

    let ctrSum = new Prisma.Decimal(0);
    let ctrCount = 0;
    let ctoSum = new Prisma.Decimal(0);
    let ctoCount = 0;

    // Bucket each show into its operational-day key in the client's timezone,
    // derived from the start_date parameter (see `deriveClientOffsetMs`).
    const offsetMs = this.deriveClientOffsetMs(startDate);
    const startHourMs = StudioPerformanceService.OPERATIONAL_DAY_START_HOUR * 60 * 60 * 1000;

    // Daily trend mapping
    const trendMap = new Map<
      string,
      { gmv: Prisma.Decimal; views: number; ctrs: Prisma.Decimal[]; ctos: Prisma.Decimal[] }
    >();

    // Seed every operational day in range so gaps render as explicit zeros.
    const cursor = new Date(startDate.getTime() + offsetMs - startHourMs);
    cursor.setUTCHours(0, 0, 0, 0);
    const lastDay = new Date(endDate.getTime() + offsetMs - startHourMs);
    lastDay.setUTCHours(0, 0, 0, 0);

    while (cursor.getTime() <= lastDay.getTime()) {
      trendMap.set(cursor.toISOString().slice(0, 10), {
        gmv: new Prisma.Decimal(0),
        views: 0,
        ctrs: [],
        ctos: [],
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const show of shows) {
      let showHasPerformance = false;
      const dateStr = this.toOperationalDayKey(show.startTime, offsetMs);
      const trendData = trendMap.get(dateStr);

      for (const sp of show.showPlatforms) {
        const spMetadata = (sp.metadata as Record<string, any> | null) ?? {};
        const templates = spMetadata.performance_templates ?? {};
        // `viewerCount` is a non-nullable column (defaults to 0), so only count
        // it when a view-count fact was actually recorded — keeping the summary
        // totals/trend consistent with the per-platform list response.
        const hasViewCount = templates.show_platform_view_count !== undefined;
        const hasRecord
          = sp.gmv !== null
          || sp.ctr !== null
          || sp.cto !== null
          || hasViewCount;

        if (hasRecord) {
          showHasPerformance = true;

          if (sp.gmv !== null) {
            totalGmv = totalGmv.add(sp.gmv);
            if (trendData) {
              trendData.gmv = trendData.gmv.add(sp.gmv);
            }
          }

          if (hasViewCount) {
            totalViews += sp.viewerCount;
            if (trendData) {
              trendData.views += sp.viewerCount;
            }
          }

          if (sp.ctr !== null) {
            ctrSum = ctrSum.add(sp.ctr);
            ctrCount++;
            if (trendData) {
              trendData.ctrs.push(sp.ctr);
            }
          }

          if (sp.cto !== null) {
            ctoSum = ctoSum.add(sp.cto);
            ctoCount++;
            if (trendData) {
              trendData.ctos.push(sp.cto);
            }
          }
        }
      }

      if (showHasPerformance) {
        recordedShowsCount++;
      }
    }

    const avgCtr = ctrCount > 0 ? ctrSum.div(ctrCount) : new Prisma.Decimal(0);
    const avgCto = ctoCount > 0 ? ctoSum.div(ctoCount) : new Prisma.Decimal(0);

    const trend = Array.from(trendMap.entries()).map(([date, data]) => {
      const dayCtr = data.ctrs.length > 0
        ? data.ctrs.reduce((a, b) => a.add(b), new Prisma.Decimal(0)).div(data.ctrs.length)
        : new Prisma.Decimal(0);
      const dayCto = data.ctos.length > 0
        ? data.ctos.reduce((a, b) => a.add(b), new Prisma.Decimal(0)).div(data.ctos.length)
        : new Prisma.Decimal(0);

      return {
        date,
        gmv: decimalToString(data.gmv) ?? '0.00',
        views: data.views,
        ctr: decimalToString(dayCtr) ?? '0.00',
        cto: decimalToString(dayCto) ?? '0.00',
      };
    });

    return {
      total_gmv: decimalToString(totalGmv) ?? '0.00',
      total_views: totalViews,
      avg_ctr: decimalToString(avgCtr) ?? '0.00',
      avg_cto: decimalToString(avgCto) ?? '0.00',
      recorded_shows_count: recordedShowsCount,
      total_shows_count: totalShowsCount,
      trend,
      currency,
      locale,
    };
  }

  async getPerformanceShows(
    studioUid: string,
    query: PerformanceShowsQuery,
  ): Promise<{ items: ShowPerformanceResponse[]; total: number }> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    this.validateDateRange(startDate, endDate);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const whereClause = this.buildShowWhere(studioUid, query);
    const include = {
      client: true,
      showType: true,
      showPlatforms: {
        where: this.buildShowPlatformsWhere(query),
        include: { platform: true },
      },
    } satisfies Prisma.ShowInclude;

    const sortRules = this.withSortTieBreaker(query.sort);

    // Sorting by a derived metric (GMV/Views/CTR/CTO) can't be expressed in SQL
    // — those values live in per-platform columns/JSON aggregated per show — so
    // it requires loading the full result set and ordering in memory. A pure
    // start_time sort (the default) stays on the fast DB path: the database
    // orders and paginates, returning at most `limit` rows.
    const needsInMemorySort = sortRules.some((rule) => rule.field !== 'start_time');

    if (!needsInMemorySort) {
      const startTimeDesc = sortRules.find((rule) => rule.field === 'start_time')?.desc ?? true;
      const [shows, total] = await Promise.all([
        this.prisma.show.findMany({
          where: whereClause,
          include,
          orderBy: { startTime: startTimeDesc ? 'desc' : 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.show.count({ where: whereClause }),
      ]);
      return { items: shows.map((show) => this.mapShowToPerformance(show)), total };
    }

    // Metric sort path: load every matching row, order in memory, then slice.
    const shows = await this.prisma.show.findMany({ where: whereClause, include });
    const mappedItems = shows.map((show) => this.mapShowToPerformance(show));
    // The full matched set is already in hand, so `total` is its length — no
    // separate COUNT query (which could also race the findMany under writes).
    const total = mappedItems.length;

    mappedItems.sort((a, b) => {
      for (const rule of sortRules) {
        const comp = this.compareSortValues(
          this.calculateShowSortValue(a, rule.field),
          this.calculateShowSortValue(b, rule.field),
          rule.desc,
        );
        if (comp !== 0) {
          return comp;
        }
      }
      return 0;
    });

    return { items: mappedItems.slice(skip, skip + limit), total };
  }

  /** Maps a show row (with relations) to its performance response shape. */
  private mapShowToPerformance(show: ShowWithPerformanceRelations): ShowPerformanceResponse {
    return {
      id: show.uid,
      name: show.name,
      start_time: show.startTime.toISOString(),
      end_time: show.endTime.toISOString(),
      client_name: show.client?.name ?? null,
      show_type_name: show.showType?.name ?? null,
      platforms: show.showPlatforms.map((sp) => {
        const metadata = (sp.metadata as Record<string, any> | null) ?? {};
        const templates = metadata.performance_templates ?? {};
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
  private withSortTieBreaker(rules: PerformanceSortRule[] | undefined): PerformanceSortRule[] {
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
  private calculateShowSortValue(item: ShowPerformanceResponse, field: PerformanceSortField): SortValue {
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
  private compareSortValues(a: SortValue, b: SortValue, desc: boolean): number {
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

  async getShowPerformanceLoops(
    studioUid: string,
    showUid: string,
  ): Promise<ShowPerformanceLoopsResponse> {
    const show = await this.prisma.show.findFirst({
      where: {
        uid: showUid,
        studio: { uid: studioUid },
        deletedAt: null,
      },
      include: {
        studio: {
          select: {
            metadata: true,
          },
        },
        showPlatforms: {
          where: { deletedAt: null },
          include: {
            platform: true,
          },
        },
      },
    });

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const { locale, currency } = this.resolveLocalization(show.studio?.metadata);

    const tasks = await this.prisma.task.findMany({
      where: {
        targets: {
          some: {
            showId: show.id,
            deletedAt: null,
          },
        },
        status: {
          in: [...StudioPerformanceService.LOOP_METRIC_TASK_STATUSES],
        },
        deletedAt: null,
      },
      include: {
        snapshot: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // A show may have several finalized moderation tasks; the most recently
    // updated one that carries a loop schema is authoritative ("latest wins").
    // Older tasks are intentionally ignored — re-moderation supersedes prior runs.
    let selectedTask: any = null;
    let loopsMetadata: any[] = [];

    for (const task of tasks) {
      const schema = task.snapshot?.schema as any;
      if (schema && schema.metadata && Array.isArray(schema.metadata.loops)) {
        selectedTask = task;
        loopsMetadata = schema.metadata.loops;
        break;
      }
    }

    if (!selectedTask) {
      return { loops: [], currency, locale };
    }

    const schema = selectedTask.snapshot.schema as any;
    // Snapshot JSON is untyped; guard against a non-array `items` so a malformed
    // schema yields empty metrics rather than throwing at `.filter`.
    const items: any[] = Array.isArray(schema.items) ? schema.items : [];
    const content = (selectedTask.content as Record<string, any>) ?? {};

    // Field keys may be absent or non-string in legacy snapshots; lowercase
    // only real strings so matching never throws on, say, a numeric key.
    const lower = (value: unknown): string | undefined =>
      typeof value === 'string' ? value.toLowerCase() : undefined;

    const loops = loopsMetadata.map((loop) => {
      const loopFields = items.filter((item) => item.group === loop.id);

      let gmvFieldId: string | null = null;
      let viewFieldId: string | null = null;
      let ctrFieldId: string | null = null;
      let ctoFieldId: string | null = null;

      for (const item of loopFields) {
        const key = lower(item.key);
        const sharedKey = lower(item.shared_field_key);
        const factKey = item.system_fact_key;

        if (factKey === 'show_platform_gmv' || sharedKey === 'gmv' || key === 'gmv') {
          gmvFieldId = item.id;
        } else if (
          factKey === 'show_platform_view_count'
          || sharedKey === 'viewer_count'
          || key === 'views'
          || key === 'viewercount'
          || key === 'viewer_count'
        ) {
          viewFieldId = item.id;
        } else if (factKey === 'show_platform_ctr' || sharedKey === 'ctr' || key === 'ctr') {
          ctrFieldId = item.id;
        } else if (factKey === 'show_platform_cto' || sharedKey === 'cto' || key === 'cto') {
          ctoFieldId = item.id;
        }
      }

      const metrics = show.showPlatforms.map((sp) => {
        const getVal = (fieldId: string | null) => {
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

        const formatDecimal = (val: any) => {
          if (val === null || val === undefined || val === '')
            return null;
          try {
            const d = new Prisma.Decimal(val);
            return decimalToString(d);
          } catch {
            return String(val);
          }
        };

        const formatInt = (val: any) => {
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
        durationMin: Number(loop.durationMin) || StudioPerformanceService.DEFAULT_LOOP_DURATION_MIN,
        metrics,
      };
    });

    return { loops, currency, locale };
  }
}
