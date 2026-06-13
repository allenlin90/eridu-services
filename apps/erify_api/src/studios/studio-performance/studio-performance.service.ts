import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  PerformanceQuery,
  PerformanceShowsQuery,
  PerformanceSummaryResponse,
  ShowPerformanceLoopsResponse,
  ShowPerformanceResponse,
  ShowPerformanceSeriesResponse,
} from '@eridu/api-types/performance';

import { StudioPerformanceRepository } from './studio-performance.repository';
import { StudioPerformanceCalculatorService } from './studio-performance-calculator.service';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import {
  deriveClientOffsetMs,
  OPERATIONAL_DAY_START_HOUR,
  toOperationalDayKey,
} from '@/lib/utils/operational-day.util';

@Injectable()
export class StudioPerformanceService {
  /** Maximum span (in days) a performance query is allowed to cover. */
  private static readonly MAX_DATE_RANGE_DAYS = 31;

  /** Locale/currency applied when a studio has no localization metadata. */
  private static readonly DEFAULT_LOCALE = 'th-TH';
  private static readonly DEFAULT_CURRENCY = 'THB';

  constructor(
    private readonly performanceRepo: StudioPerformanceRepository,
    private readonly performanceCalculator: StudioPerformanceCalculatorService,
  ) {}

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

    const studio = await this.performanceRepo.findStudioLocalizationMetadata(studioUid);
    const { locale, currency } = this.resolveLocalization(studio?.metadata);

    // The presence filter (`has_performance`) is a list-only concern. Applying
    // it here would make the summary self-referential — e.g. with
    // `has_performance=true` the "recorded vs total" card would always read
    // 100% — so the summary always aggregates the whole date-range population
    // (the repository clears `has_performance` before building the where).
    const shows = await this.performanceRepo.findShowsForSummary(studioUid, query);

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
    const offsetMs = deriveClientOffsetMs(startDate);
    const startHourMs = OPERATIONAL_DAY_START_HOUR * 60 * 60 * 1000;

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
      const dateStr = toOperationalDayKey(show.startTime, offsetMs);
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

    const sortRules = this.performanceCalculator.withSortTieBreaker(query.sort);

    // Sorting by a derived metric (GMV/Views/CTR/CTO) can't be expressed in SQL
    // — those values live in per-platform columns/JSON aggregated per show — so
    // it requires loading the full result set and ordering in memory. A pure
    // start_time sort (the default) stays on the fast DB path: the database
    // orders and paginates, returning at most `limit` rows.
    const needsInMemorySort = sortRules.some((rule) => rule.field !== 'start_time');

    if (!needsInMemorySort) {
      const startTimeDesc = sortRules.find((rule) => rule.field === 'start_time')?.desc ?? true;
      const [shows, total] = await Promise.all([
        this.performanceRepo.findShowsForList(studioUid, query, {
          orderBy: { startTime: startTimeDesc ? 'desc' : 'asc' },
          skip,
          take: limit,
        }),
        this.performanceRepo.countShows(studioUid, query),
      ]);
      return { items: shows.map((show) => this.performanceCalculator.mapShowToPerformance(show)), total };
    }

    // Metric sort path: load every matching row, order in memory, then slice.
    const shows = await this.performanceRepo.findShowsForList(studioUid, query);
    const mappedItems = shows.map((show) => this.performanceCalculator.mapShowToPerformance(show));
    // The full matched set is already in hand, so `total` is its length — no
    // separate COUNT query (which could also race the findMany under writes).
    const total = mappedItems.length;

    mappedItems.sort((a, b) => {
      for (const rule of sortRules) {
        const comp = this.performanceCalculator.compareSortValues(
          this.performanceCalculator.calculateShowSortValue(a, rule.field),
          this.performanceCalculator.calculateShowSortValue(b, rule.field),
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

  async getShowPerformanceLoops(
    studioUid: string,
    showUid: string,
  ): Promise<ShowPerformanceLoopsResponse> {
    const show = await this.performanceRepo.findShowForLoops(studioUid, showUid);

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const { locale, currency } = this.resolveLocalization(show.studio?.metadata);

    const tasks = await this.performanceRepo.findFinalizedLoopTasksForShow(show.id);

    const selected = this.performanceCalculator.selectLoopBearingTask(tasks);
    if (!selected) {
      return { loops: [], currency, locale };
    }

    const loops = this.performanceCalculator.buildLoopItems(
      selected.loopsMetadata,
      selected.task.snapshot.schema,
      (selected.task.content as Record<string, any>) ?? {},
      show.showPlatforms,
    );

    return { loops, currency, locale };
  }

  /**
   * Per-show "By Show" graph series: every show matching the query (no
   * pagination), ordered by `start_time` ascending. Carries show-level GMV /
   * view aggregates from the stored `ShowPlatform` columns and the **peak** CTR /
   * CTO reached across the show's moderation loops × platforms.
   */
  async getPerformanceShowsSeries(
    studioUid: string,
    query: PerformanceQuery,
  ): Promise<ShowPerformanceSeriesResponse> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    this.validateDateRange(startDate, endDate);

    const studio = await this.performanceRepo.findStudioLocalizationMetadata(studioUid);
    const { locale, currency } = this.resolveLocalization(studio?.metadata);

    const shows = await this.performanceRepo.findShowsForSeries(studioUid, query);

    if (shows.length === 0) {
      return { shows: [], currency, locale };
    }

    // Batch-load finalized loop-bearing tasks for every show in range in one
    // query (no N+1), ordered most-recent first, then group by target show so
    // each show resolves its own "latest wins" task locally.
    const showIds = shows.map((s) => s.id);
    const tasks = await this.performanceRepo.findFinalizedLoopTasksForShows(showIds);

    const tasksByShowId = new Map<string, typeof tasks>();
    for (const task of tasks) {
      for (const target of task.targets) {
        if (target.showId === null) {
          continue;
        }
        const key = target.showId.toString();
        const list = tasksByShowId.get(key);
        if (list) {
          list.push(task);
        } else {
          tasksByShowId.set(key, [task]);
        }
      }
    }

    const seriesShows = shows.map((show) => {
      const { gmv, views } = this.performanceCalculator.sumShowStoredAggregates(show.showPlatforms);

      let peakCtr: string | null = null;
      let peakCto: string | null = null;

      const selected = this.performanceCalculator.selectLoopBearingTask(tasksByShowId.get(show.id.toString()) ?? []);
      if (selected) {
        const loops = this.performanceCalculator.buildLoopItems(
          selected.loopsMetadata,
          selected.task.snapshot.schema,
          (selected.task.content as Record<string, any>) ?? {},
          show.showPlatforms,
        );
        const peak = this.performanceCalculator.computePeakFromLoops(loops);
        peakCtr = peak.peakCtr;
        peakCto = peak.peakCto;
      }

      return {
        id: show.uid,
        name: show.name,
        start_time: show.startTime.toISOString(),
        gmv,
        views,
        peak_ctr: peakCtr,
        peak_cto: peakCto,
      };
    });

    return { shows: seriesShows, currency, locale };
  }
}
