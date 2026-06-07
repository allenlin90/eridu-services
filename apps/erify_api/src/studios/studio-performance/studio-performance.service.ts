import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  PerformanceQuery,
  PerformanceShowsQuery,
  PerformanceSummaryResponse,
  ShowPerformanceResponse,
} from '@eridu/api-types/performance';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class StudioPerformanceService {
  /** Maximum span (in days) a performance query is allowed to cover. */
  private static readonly MAX_DATE_RANGE_DAYS = 31;

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
    const metadata = (studio?.metadata as Record<string, any> | null) ?? {};
    const localization = metadata.localization ?? {};
    const locale = localization.locale ?? 'th-TH';
    const currency = localization.currency ?? 'THB';

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

    const total = await this.prisma.show.count({ where: whereClause });
    const shows = await this.prisma.show.findMany({
      where: whereClause,
      include: {
        client: true,
        showType: true,
        showPlatforms: {
          where: this.buildShowPlatformsWhere(query),
          include: {
            platform: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      skip,
      take: limit,
    });

    const items = shows.map((show) => {
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
          // `viewerCount` is a non-nullable column (defaults to 0), so its
          // provenance comes from the recorded view-count fact rather than the
          // column itself; gmv/ctr/cto are nullable and speak for themselves.
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
    });

    return { items, total };
  }
}
