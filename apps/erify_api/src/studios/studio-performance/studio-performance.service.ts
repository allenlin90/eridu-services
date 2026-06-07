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

    const hasPerformance = query.has_performance;
    let performanceFilter: Prisma.ShowWhereInput = {};
    if (hasPerformance === 'true') {
      performanceFilter = {
        showPlatforms: {
          some: {
            deletedAt: null,
            OR: [
              { gmv: { not: null } },
              { ctr: { not: null } },
              { cto: { not: null } },
              {
                metadata: {
                  path: ['performance_templates', 'show_platform_view_count'],
                  not: Prisma.JsonNull,
                },
              },
            ],
          },
        },
      };
    } else if (hasPerformance === 'false') {
      performanceFilter = {
        NOT: {
          showPlatforms: {
            some: {
              deletedAt: null,
              OR: [
                { gmv: { not: null } },
                { ctr: { not: null } },
                { cto: { not: null } },
                {
                  metadata: {
                    path: ['performance_templates', 'show_platform_view_count'],
                    not: Prisma.JsonNull,
                  },
                },
              ],
            },
          },
        },
      };
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
      ...(platformUids.length > 0
        ? {
            showPlatforms: {
              some: {
                deletedAt: null,
                platform: { uid: { in: platformUids } },
              },
            },
          }
        : {}),
      ...(name
        ? {
            name: {
              contains: name,
              mode: 'insensitive',
            },
          }
        : {}),
      ...performanceFilter,
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

    const shows = await this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, query),
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

    // Derive client timezone offset from start_date parameter
    const startUtcHours = startDate.getUTCHours();
    const startUtcMinutes = startDate.getUTCMinutes();
    const utcTimeInMinutes = startUtcHours * 60 + startUtcMinutes;
    const localTimeInMinutes = 6 * 60; // 06:00
    let offsetInMinutes = localTimeInMinutes - utcTimeInMinutes;
    if (offsetInMinutes > 720) {
      offsetInMinutes -= 1440;
    } else if (offsetInMinutes < -720) {
      offsetInMinutes += 1440;
    }
    const timezoneOffsetMs = offsetInMinutes * 60 * 1000;

    // Daily trend mapping
    const trendMap = new Map<
      string,
      { gmv: Prisma.Decimal; views: number; ctrs: Prisma.Decimal[]; ctos: Prisma.Decimal[] }
    >();

    const startOp = new Date(startDate.getTime() + timezoneOffsetMs - 6 * 60 * 60 * 1000);
    const endOp = new Date(endDate.getTime() + timezoneOffsetMs - 6 * 60 * 60 * 1000);

    const curr = new Date(startOp);
    curr.setUTCHours(0, 0, 0, 0);
    const endOpTime = new Date(endOp);
    endOpTime.setUTCHours(0, 0, 0, 0);

    while (curr.getTime() <= endOpTime.getTime()) {
      const dateStr = curr.toISOString().slice(0, 10);
      trendMap.set(dateStr, {
        gmv: new Prisma.Decimal(0),
        views: 0,
        ctrs: [],
        ctos: [],
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    for (const show of shows) {
      let showHasPerformance = false;
      const opTime = new Date(show.startTime.getTime() + timezoneOffsetMs - 6 * 60 * 60 * 1000);
      const dateStr = opTime.toISOString().slice(0, 10);
      const trendData = trendMap.get(dateStr);

      for (const sp of show.showPlatforms) {
        const metadata = (sp.metadata as Record<string, any> | null) ?? {};
        const templates = metadata.performance_templates ?? {};
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
