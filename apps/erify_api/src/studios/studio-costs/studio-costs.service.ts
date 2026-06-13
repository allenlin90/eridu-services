import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  CostsQuery,
  CostsShiftsQuery,
  CostsShiftsSortRule,
  CostsShowsQuery,
  CostsShowsSortRule,
  CostsSummaryResponse,
  CostsTrendCoordinate,
  ShiftCostResponse,
  ShowCostResponse,
} from '@eridu/api-types/costs';
import {
  parseCostsShiftsSort,
  parseCostsShowsSort,
} from '@eridu/api-types/costs';

import { StudioCostCalculatorService } from './studio-cost-calculator.service';
import { StudioCostsRepository } from './studio-costs.repository';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import {
  deriveClientOffsetMs,
  OPERATIONAL_DAY_START_HOUR,
  toOperationalDayKey,
} from '@/lib/utils/operational-day.util';

@Injectable()
export class StudioCostsService {
  private static readonly MAX_DATE_RANGE_DAYS = 31;
  private static readonly DEFAULT_LOCALE = 'th-TH';
  private static readonly DEFAULT_CURRENCY = 'THB';

  constructor(
    private readonly costsRepo: StudioCostsRepository,
    private readonly costCalculator: StudioCostCalculatorService,
  ) {}

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('end_date must be on or after start_date');
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > StudioCostsService.MAX_DATE_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${StudioCostsService.MAX_DATE_RANGE_DAYS} days`,
      );
    }
  }

  private resolveLocalization(metadata: unknown): { locale: string; currency: string } {
    const localization = ((metadata as Record<string, any> | null)?.localization ?? {}) as Record<string, any>;
    return {
      locale: localization.locale ?? StudioCostsService.DEFAULT_LOCALE,
      currency: localization.currency ?? StudioCostsService.DEFAULT_CURRENCY,
    };
  }

  async getCostsSummary(
    studioUid: string,
    query: CostsQuery,
  ): Promise<CostsSummaryResponse> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    this.validateDateRange(startDate, endDate);

    const studio = await this.costsRepo.findStudioLocalizationMetadata(studioUid);
    const { locale, currency } = this.resolveLocalization(studio?.metadata);

    const shows = await this.costsRepo.findShowsForCosts(studioUid, query);
    const shifts = await this.costsRepo.findShiftsForCosts(studioUid, query);

    const totalShowsCount = shows.length;
    let unresolvedShowsCount = 0;
    let showCostSubtotal = new Prisma.Decimal(0);

    const totalShiftsCount = shifts.length;
    let unresolvedShiftsCount = 0;
    let shiftCostSubtotal = new Prisma.Decimal(0);

    const offsetMs = deriveClientOffsetMs(startDate);
    const startHourMs = OPERATIONAL_DAY_START_HOUR * 60 * 60 * 1000;

    const trendMap = new Map<string, { show_cost: Prisma.Decimal; shift_cost: Prisma.Decimal }>();

    // Accumulates a resolved cost into its operational-day bucket. Buckets are
    // pre-seeded for every day in range (below), but we lazily create one for
    // any straggler key so the trend always reconciles with the subtotals —
    // i.e. sum(trend.show_cost) === show_cost_subtotal and likewise for shifts.
    // Without this a key outside the seeded range would silently drop the cost
    // from the trend while still counting it in the subtotal.
    const addToTrend = (dateStr: string, field: 'show_cost' | 'shift_cost', amount: Prisma.Decimal) => {
      let bucket = trendMap.get(dateStr);
      if (!bucket) {
        bucket = { show_cost: new Prisma.Decimal(0), shift_cost: new Prisma.Decimal(0) };
        trendMap.set(dateStr, bucket);
      }
      bucket[field] = bucket[field].add(amount);
    };

    // Seed every operational day in range
    const cursor = new Date(startDate.getTime() + offsetMs - startHourMs);
    cursor.setUTCHours(0, 0, 0, 0);
    const lastDay = new Date(endDate.getTime() + offsetMs - startHourMs);
    lastDay.setUTCHours(0, 0, 0, 0);

    while (cursor.getTime() <= lastDay.getTime()) {
      trendMap.set(cursor.toISOString().slice(0, 10), {
        show_cost: new Prisma.Decimal(0),
        shift_cost: new Prisma.Decimal(0),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const show of shows) {
      const calculated = this.costCalculator.calculateShowCost(show);

      if (calculated.total_cost === null) {
        unresolvedShowsCount++;
      } else {
        showCostSubtotal = showCostSubtotal.add(calculated.total_cost);
        // `startTime` is a UTC instant, so it must be mapped through the
        // operational-day offset to land in the right local-day bucket.
        addToTrend(toOperationalDayKey(show.startTime, offsetMs), 'show_cost', calculated.total_cost);
      }
    }

    for (const shift of shifts) {
      const calculated = this.costCalculator.calculateShiftCost(shift);

      if (calculated.total_cost === null) {
        unresolvedShiftsCount++;
      } else {
        shiftCostSubtotal = shiftCostSubtotal.add(calculated.total_cost);
        // `shift.date` is a date-only column persisted at UTC midnight of the
        // operational day, so its date portion is already the bucket key — no
        // offset math (unlike `show.startTime`, which is a true instant).
        addToTrend(shift.date.toISOString().slice(0, 10), 'shift_cost', calculated.total_cost);
      }
    }

    const trend: CostsTrendCoordinate[] = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        show_cost: data.show_cost.toFixed(2),
        shift_cost: data.shift_cost.toFixed(2),
        total_cost: data.show_cost.add(data.shift_cost).toFixed(2),
      }));

    return {
      total_cost: showCostSubtotal.add(shiftCostSubtotal).toFixed(2),
      show_cost_subtotal: showCostSubtotal.toFixed(2),
      shift_cost_subtotal: shiftCostSubtotal.toFixed(2),
      unresolved_shows_count: unresolvedShowsCount,
      total_shows_count: totalShowsCount,
      unresolved_shifts_count: unresolvedShiftsCount,
      total_shifts_count: totalShiftsCount,
      trend,
      currency,
      locale,
    };
  }

  private withShowsSortTieBreaker(rules: CostsShowsSortRule[] | string | undefined): CostsShowsSortRule[] {
    let result: CostsShowsSortRule[] = [];
    if (Array.isArray(rules)) {
      result = [...rules];
    } else if (typeof rules === 'string') {
      const parsed = parseCostsShowsSort(rules);
      if (parsed) {
        result = parsed;
      }
    }
    if (!result.some((rule) => rule.field === 'start_time')) {
      result.push({ field: 'start_time', desc: true });
    }
    return result;
  }

  private compareSortValues(a: number | string | null, b: number | string | null, desc: boolean): number {
    if (a === null && b === null)
      return 0;
    if (a === null)
      return 1;
    if (b === null)
      return -1;

    let comp = 0;
    if (typeof a === 'number' && typeof b === 'number') {
      comp = a - b;
    } else {
      comp = String(a).localeCompare(String(b));
    }
    return desc ? -comp : comp;
  }

  async getCostsShows(
    studioUid: string,
    query: CostsShowsQuery,
  ): Promise<{ items: ShowCostResponse[]; total: number }> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    this.validateDateRange(startDate, endDate);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const sortRules = this.withShowsSortTieBreaker(query.sort);
    const needsInMemorySort = sortRules.some((rule) => rule.field === 'total_cost');

    if (!needsInMemorySort) {
      const dbOrderBy: Prisma.ShowOrderByWithRelationInput[] = sortRules.map((rule) => {
        if (rule.field === 'start_time') {
          return { startTime: rule.desc ? 'desc' : 'asc' };
        }
        if (rule.field === 'name') {
          return { name: rule.desc ? 'desc' : 'asc' };
        }
        return { startTime: 'desc' };
      });

      const [shows, total] = await Promise.all([
        this.costsRepo.findShowsForCosts(studioUid, query, {
          orderBy: dbOrderBy,
          skip,
          take: limit,
        }),
        this.costsRepo.countShows(studioUid, query),
      ]);

      const items = shows.map((show) => {
        const calculated = this.costCalculator.calculateShowCost(show);
        return {
          id: show.uid,
          name: show.name,
          start_time: show.startTime.toISOString(),
          end_time: show.endTime.toISOString(),
          client_name: show.client?.name ?? null,
          show_type_name: show.showType?.name ?? null,
          show_standard_name: show.showStandard?.name ?? null,
          creators: calculated.creators,
          line_item_subtotal: calculated.line_item_subtotal.toFixed(2),
          total_cost: calculated.total_cost ? calculated.total_cost.toFixed(2) : null,
          unresolved_reasons: calculated.unresolved_reasons,
          calculation_warnings: calculated.calculation_warnings,
          actuals_source: calculated.actuals_source,
        };
      });

      return { items, total };
    }

    // total_cost is a computed (non-column) value, so it cannot be ordered or
    // paginated in the database. We deliberately load the full filtered set,
    // sort in memory, then slice. This is bounded by MAX_DATE_RANGE_DAYS (31d)
    // which caps the row count; revisit (e.g. a materialized cost column) if
    // the deep include tree ever makes this load too heavy.
    const shows = await this.costsRepo.findShowsForCosts(studioUid, query);
    const mappedItems = shows.map((show) => {
      const calculated = this.costCalculator.calculateShowCost(show);
      return {
        id: show.uid,
        name: show.name,
        start_time: show.startTime.toISOString(),
        end_time: show.endTime.toISOString(),
        client_name: show.client?.name ?? null,
        show_type_name: show.showType?.name ?? null,
        show_standard_name: show.showStandard?.name ?? null,
        creators: calculated.creators,
        line_item_subtotal: calculated.line_item_subtotal.toFixed(2),
        total_cost: calculated.total_cost ? calculated.total_cost.toFixed(2) : null,
        unresolved_reasons: calculated.unresolved_reasons,
        calculation_warnings: calculated.calculation_warnings,
        actuals_source: calculated.actuals_source,
      };
    });

    const total = mappedItems.length;

    mappedItems.sort((a, b) => {
      for (const rule of sortRules) {
        let comp = 0;
        if (rule.field === 'total_cost') {
          const valA = a.total_cost ? Number(a.total_cost) : null;
          const valB = b.total_cost ? Number(b.total_cost) : null;
          comp = this.compareSortValues(valA, valB, rule.desc);
        } else if (rule.field === 'start_time') {
          comp = this.compareSortValues(a.start_time, b.start_time, rule.desc);
        } else if (rule.field === 'name') {
          comp = this.compareSortValues(a.name, b.name, rule.desc);
        }
        if (comp !== 0) {
          return comp;
        }
      }
      return 0;
    });

    return { items: mappedItems.slice(skip, skip + limit), total };
  }

  private withShiftsSortTieBreaker(rules: CostsShiftsSortRule[] | string | undefined): CostsShiftsSortRule[] {
    let result: CostsShiftsSortRule[] = [];
    if (Array.isArray(rules)) {
      result = [...rules];
    } else if (typeof rules === 'string') {
      const parsed = parseCostsShiftsSort(rules);
      if (parsed) {
        result = parsed;
      }
    }
    if (!result.some((rule) => rule.field === 'date')) {
      result.push({ field: 'date', desc: true });
    }
    return result;
  }

  async getCostsShifts(
    studioUid: string,
    query: CostsShiftsQuery,
  ): Promise<{ items: ShiftCostResponse[]; total: number }> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    this.validateDateRange(startDate, endDate);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const sortRules = this.withShiftsSortTieBreaker(query.sort);
    const needsInMemorySort = sortRules.some((rule) => rule.field === 'total_cost');

    if (!needsInMemorySort) {
      const dbOrderBy: Prisma.StudioShiftOrderByWithRelationInput[] = sortRules.map((rule) => {
        if (rule.field === 'date') {
          return { date: rule.desc ? 'desc' : 'asc' };
        }
        return { date: 'desc' };
      });

      const [shifts, total] = await Promise.all([
        this.costsRepo.findShiftsForCosts(studioUid, query, {
          orderBy: dbOrderBy,
          skip,
          take: limit,
        }),
        this.costsRepo.countShifts(studioUid, query),
      ]);

      const items = shifts.map((shift) => {
        const calculated = this.costCalculator.calculateShiftCost(shift);
        return {
          id: shift.uid,
          date: shift.date.toISOString().slice(0, 10),
          member_name: shift.user.name,
          member_role: shift.user.studioMemberships[0]?.role ?? 'MEMBER',
          hourly_rate: decimalToString(shift.hourlyRate) ?? '0.00',
          status: shift.status,
          blocks: calculated.blocks,
          line_item_subtotal: calculated.line_item_subtotal.toFixed(2),
          total_cost: calculated.total_cost ? calculated.total_cost.toFixed(2) : null,
          unresolved_reasons: calculated.unresolved_reasons,
          calculation_warnings: calculated.calculation_warnings,
          actuals_source: calculated.actuals_source,
        };
      });

      return { items, total };
    }

    // total_cost is a computed (non-column) value, so it cannot be ordered or
    // paginated in the database. We deliberately load the full filtered set,
    // sort in memory, then slice. This is bounded by MAX_DATE_RANGE_DAYS (31d)
    // which caps the row count; revisit (e.g. a materialized cost column) if
    // the deep include tree ever makes this load too heavy.
    const shifts = await this.costsRepo.findShiftsForCosts(studioUid, query);
    const mappedItems = shifts.map((shift) => {
      const calculated = this.costCalculator.calculateShiftCost(shift);
      return {
        id: shift.uid,
        date: shift.date.toISOString().slice(0, 10),
        member_name: shift.user.name,
        // Current studio membership role (first active membership), not the
        // role held at shift time — acceptable for a cost breakdown view.
        member_role: shift.user.studioMemberships[0]?.role ?? 'MEMBER',
        // hourlyRate is a non-null Decimal column; format directly.
        hourly_rate: shift.hourlyRate.toFixed(2),
        status: shift.status,
        blocks: calculated.blocks,
        line_item_subtotal: calculated.line_item_subtotal.toFixed(2),
        total_cost: calculated.total_cost ? calculated.total_cost.toFixed(2) : null,
        unresolved_reasons: calculated.unresolved_reasons,
        calculation_warnings: calculated.calculation_warnings,
        actuals_source: calculated.actuals_source,
      };
    });

    const total = mappedItems.length;

    mappedItems.sort((a, b) => {
      for (const rule of sortRules) {
        let comp = 0;
        if (rule.field === 'total_cost') {
          const valA = a.total_cost ? Number(a.total_cost) : null;
          const valB = b.total_cost ? Number(b.total_cost) : null;
          comp = this.compareSortValues(valA, valB, rule.desc);
        } else if (rule.field === 'date') {
          comp = this.compareSortValues(a.date, b.date, rule.desc);
        }
        if (comp !== 0) {
          return comp;
        }
      }
      return 0;
    });

    return { items: mappedItems.slice(skip, skip + limit), total };
  }
}
