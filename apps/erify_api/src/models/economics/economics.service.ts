import { Injectable } from '@nestjs/common';

import type {
  CreatorCostItem,
  GroupedEconomicsFilters,
  GroupedEconomicsResult,
  ShiftCostItem,
  ShowEconomicsResult,
} from './schemas/economics.schema';
import type { ShowCreatorWithCreator, ShowWithGroupedRelations } from './economics.repository';
import { EconomicsRepository } from './economics.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { decimalToString } from '@/lib/utils/decimal-to-string.util';
import type { StudioShiftWithRelations } from '@/models/studio-shift/studio-shift.repository';

@Injectable()
export class EconomicsService {
  constructor(private readonly economicsRepository: EconomicsRepository) {}

  async getShowEconomics(studioUid: string, showUid: string): Promise<ShowEconomicsResult> {
    // 1. Load show with relations (client + showCreators with creator defaults)
    const show = await this.economicsRepository.findShowWithEconomicsRelations(showUid);
    if (!show) {
      throw HttpError.notFound('Show', showUid);
    }

    // 2. Compute creator costs (already included via relations)
    const creatorCosts = (show.showCreators ?? []).map((sc) =>
      this.computeCreatorCost(sc),
    );

    // 3. Load overlapping shifts
    const shifts = await this.economicsRepository.findOverlappingShifts(
      studioUid,
      show.startTime,
      show.endTime,
    );

    // 4. Compute shift costs with proportional overlap
    const shiftCosts = this.computeShiftCosts(shifts, show.startTime, show.endTime);

    // 5. Calculate totals
    const totalCreatorCost = creatorCosts.reduce(
      (sum, c) => sum + (c.computedCost ? Number(c.computedCost) : 0),
      0,
    );
    const totalShiftCost = shiftCosts.reduce(
      (sum, s) => sum + Number(s.attributedCost),
      0,
    );

    return {
      showUid: show.uid,
      showName: show.name,
      showExternalId: show.externalId ?? null,
      startTime: show.startTime,
      endTime: show.endTime,
      clientName: show.client?.name ?? '',
      creatorCosts,
      shiftCosts,
      totalCreatorCost: totalCreatorCost.toFixed(2),
      totalShiftCost: totalShiftCost.toFixed(2),
      totalCost: (totalCreatorCost + totalShiftCost).toFixed(2),
    };
  }

  async getGroupedEconomics(
    studioUid: string,
    filters: GroupedEconomicsFilters,
  ): Promise<GroupedEconomicsResult> {
    // 1. Load all shows matching filters (with creators included)
    const shows = await this.economicsRepository.findShowsForGroupedQuery(studioUid, filters);

    // 2. Load all overlapping shifts for the entire date range
    const shifts = await this.economicsRepository.findOverlappingShifts(
      studioUid,
      filters.dateFrom,
      filters.dateTo,
    );

    // 3. Compute per-show economics
    const showEconomics = shows.map((show) => {
      const creatorCosts = (show.showCreators ?? []).map((sc) =>
        this.computeCreatorCost(sc),
      );
      const shiftCosts = this.computeShiftCosts(shifts, show.startTime, show.endTime);

      const totalCreatorCost = creatorCosts.reduce(
        (sum, c) => sum + (c.computedCost ? Number(c.computedCost) : 0),
        0,
      );
      const totalShiftCost = shiftCosts.reduce(
        (sum, s) => sum + Number(s.attributedCost),
        0,
      );

      return {
        show,
        totalCreatorCost,
        totalShiftCost,
        totalCost: totalCreatorCost + totalShiftCost,
      };
    });

    // 4. Group by the requested dimension
    const groups = this.groupResults(showEconomics, filters.groupBy);

    // 5. Build summary
    const summary = {
      totalCreatorCost: showEconomics
        .reduce((s, e) => s + e.totalCreatorCost, 0)
        .toFixed(2),
      totalShiftCost: showEconomics
        .reduce((s, e) => s + e.totalShiftCost, 0)
        .toFixed(2),
      totalCost: showEconomics.reduce((s, e) => s + e.totalCost, 0).toFixed(2),
      showCount: shows.length,
    };

    return { groups, summary };
  }

  // ============================================================================
  // Private computation helpers
  // ============================================================================

  private computeCreatorCost(showCreator: ShowCreatorWithCreator): CreatorCostItem {
    const creator = showCreator.creator;

    // Rate resolution: ShowCreator overrides → Creator defaults
    const compensationType
      = showCreator.compensationType ?? creator?.defaultRateType ?? null;
    const agreedRate = showCreator.agreedRate ?? creator?.defaultRate ?? null;

    // Only FIXED type produces a computed cost
    const computedCost
      = compensationType === 'FIXED' && agreedRate
        ? decimalToString(agreedRate)
        : null;

    return {
      creatorUid: creator?.uid ?? '',
      creatorName: creator?.name ?? '',
      compensationType,
      agreedRate: decimalToString(agreedRate),
      computedCost,
    };
  }

  private computeShiftCosts(
    shifts: StudioShiftWithRelations[],
    showStart: Date,
    showEnd: Date,
  ): ShiftCostItem[] {
    return shifts
      .map((shift): ShiftCostItem | null => {
        // Calculate overlap between shift blocks and show window
        let overlapMs = 0;
        let totalBlockMs = 0;

        for (const block of shift.blocks) {
          const blockStart = block.startTime.getTime();
          const blockEnd = block.endTime.getTime();
          totalBlockMs += blockEnd - blockStart;

          const overlapStart = Math.max(blockStart, showStart.getTime());
          const overlapEnd = Math.min(blockEnd, showEnd.getTime());
          if (overlapEnd > overlapStart) {
            overlapMs += overlapEnd - overlapStart;
          }
        }

        if (overlapMs === 0 || totalBlockMs === 0)
          return null;

        const overlapMinutes = Math.round(overlapMs / (1000 * 60));
        const shiftCost = shift.calculatedCost ?? shift.projectedCost;
        const attributedCost = (overlapMs / totalBlockMs) * Number(shiftCost ?? 0);

        return {
          shiftUid: shift.uid,
          userName: shift.user?.name ?? '',
          hourlyRate: decimalToString(shift.hourlyRate) ?? '0.00',
          overlapMinutes,
          attributedCost: attributedCost.toFixed(2),
        };
      })
      .filter((item): item is ShiftCostItem => item !== null);
  }

  private groupResults(
    showEconomics: Array<{
      show: ShowWithGroupedRelations;
      totalCreatorCost: number;
      totalShiftCost: number;
      totalCost: number;
    }>,
    groupBy: 'show' | 'schedule' | 'client',
  ) {
    const groups = new Map<
      string,
      { label: string; shows: typeof showEconomics }
    >();

    for (const item of showEconomics) {
      let key: string;
      let label: string;

      switch (groupBy) {
        case 'show':
          key = item.show.uid;
          label = item.show.name;
          break;
        case 'schedule':
          key = item.show.Schedule?.uid ?? 'unscheduled';
          label = item.show.Schedule?.name ?? 'Unscheduled';
          break;
        case 'client':
          key = item.show.client?.uid ?? 'unknown';
          label = item.show.client?.name ?? 'Unknown Client';
          break;
        default:
          key = item.show.uid;
          label = item.show.name;
      }

      if (!groups.has(key)) {
        groups.set(key, { label, shows: [] });
      }
      groups.get(key)!.shows.push(item);
    }

    return Array.from(groups.entries()).map(([key, { label, shows }]) => ({
      groupKey: key,
      groupLabel: label,
      showCount: shows.length,
      totalCreatorCost: shows
        .reduce((s, e) => s + e.totalCreatorCost, 0)
        .toFixed(2),
      totalShiftCost: shows
        .reduce((s, e) => s + e.totalShiftCost, 0)
        .toFixed(2),
      totalCost: shows.reduce((s, e) => s + e.totalCost, 0).toFixed(2),
    }));
  }
}
