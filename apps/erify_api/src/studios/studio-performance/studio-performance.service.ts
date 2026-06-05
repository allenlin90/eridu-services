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
  constructor(private readonly prisma: PrismaService) {}

  async getPerformanceSummary(
    studioUid: string,
    query: PerformanceQuery,
  ): Promise<PerformanceSummaryResponse> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 31) {
      throw new BadRequestException('Date range cannot exceed 31 days');
    }

    // Parse filters
    const clientUids = query.client_id
      ? Array.isArray(query.client_id)
        ? query.client_id
        : [query.client_id]
      : [];
    const showTypeUids = query.show_type_id
      ? Array.isArray(query.show_type_id)
        ? query.show_type_id
        : [query.show_type_id]
      : [];
    const platformUids = query.platform_id
      ? Array.isArray(query.platform_id)
        ? query.platform_id
        : [query.platform_id]
      : [];

    const platformFilter = platformUids.length > 0
      ? {
          showPlatforms: {
            some: {
              deletedAt: null,
              platform: { uid: { in: platformUids } },
            },
          },
        }
      : {};

    const whereClause: Prisma.ShowWhereInput = {
      studio: { uid: studioUid },
      deletedAt: null,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      ...(clientUids.length > 0 ? { client: { uid: { in: clientUids } } } : {}),
      ...(showTypeUids.length > 0 ? { showType: { uid: { in: showTypeUids } } } : {}),
      ...platformFilter,
    };

    const shows = await this.prisma.show.findMany({
      where: whereClause,
      include: {
        showPlatforms: {
          where: {
            deletedAt: null,
            ...(platformUids.length > 0 ? { platform: { uid: { in: platformUids } } } : {}),
          },
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

    // Daily trend mapping
    const trendMap = new Map<
      string,
      { gmv: Prisma.Decimal; views: number; ctrs: Prisma.Decimal[]; ctos: Prisma.Decimal[] }
    >();

    let curr = new Date(startDate.getTime());
    while (curr <= endDate) {
      const dateStr = curr.toISOString().slice(0, 10);
      trendMap.set(dateStr, {
        gmv: new Prisma.Decimal(0),
        views: 0,
        ctrs: [],
        ctos: [],
      });
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    }

    for (const show of shows) {
      let showHasPerformance = false;
      const dateStr = show.startTime.toISOString().slice(0, 10);
      const trendData = trendMap.get(dateStr);

      for (const sp of show.showPlatforms) {
        const metadata = (sp.metadata as Record<string, any> | null) ?? {};
        const templates = metadata.performance_templates ?? {};
        const hasRecord
          = sp.gmv !== null
          || sp.ctr !== null
          || sp.cto !== null
          || templates.platform_view_count !== undefined;

        if (hasRecord) {
          showHasPerformance = true;

          if (sp.gmv !== null) {
            totalGmv = totalGmv.add(sp.gmv);
            if (trendData) {
              trendData.gmv = trendData.gmv.add(sp.gmv);
            }
          }
          totalViews += sp.viewerCount;
          if (trendData) {
            trendData.views += sp.viewerCount;
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
    };
  }

  async getPerformanceShows(
    studioUid: string,
    query: PerformanceShowsQuery,
  ): Promise<{ items: ShowPerformanceResponse[]; total: number }> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 31) {
      throw new BadRequestException('Date range cannot exceed 31 days');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const clientUids = query.client_id
      ? Array.isArray(query.client_id)
        ? query.client_id
        : [query.client_id]
      : [];
    const showTypeUids = query.show_type_id
      ? Array.isArray(query.show_type_id)
        ? query.show_type_id
        : [query.show_type_id]
      : [];
    const platformUids = query.platform_id
      ? Array.isArray(query.platform_id)
        ? query.platform_id
        : [query.platform_id]
      : [];

    const platformFilter = platformUids.length > 0
      ? {
          showPlatforms: {
            some: {
              deletedAt: null,
              platform: { uid: { in: platformUids } },
            },
          },
        }
      : {};

    const whereClause: Prisma.ShowWhereInput = {
      studio: { uid: studioUid },
      deletedAt: null,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      ...(clientUids.length > 0 ? { client: { uid: { in: clientUids } } } : {}),
      ...(showTypeUids.length > 0 ? { showType: { uid: { in: showTypeUids } } } : {}),
      ...platformFilter,
    };

    const total = await this.prisma.show.count({ where: whereClause });
    const shows = await this.prisma.show.findMany({
      where: whereClause,
      include: {
        client: true,
        showType: true,
        showPlatforms: {
          where: {
            deletedAt: null,
            ...(platformUids.length > 0 ? { platform: { uid: { in: platformUids } } } : {}),
          },
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
          const hasRecord
            = sp.gmv !== null
            || sp.ctr !== null
            || sp.cto !== null
            || templates.platform_view_count !== undefined;

          return {
            show_platform_uid: sp.uid,
            platform_id: sp.platform.uid,
            platform_name: sp.platform.name,
            gmv: hasRecord ? (decimalToString(sp.gmv) ?? '0.00') : null,
            views: hasRecord ? sp.viewerCount : null,
            ctr: hasRecord ? (decimalToString(sp.ctr) ?? '0.00') : null,
            cto: hasRecord ? (decimalToString(sp.cto) ?? '0.00') : null,
          };
        }),
      };
    });

    return { items, total };
  }
}
