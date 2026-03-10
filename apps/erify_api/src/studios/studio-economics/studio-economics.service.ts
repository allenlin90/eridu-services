import { Injectable } from '@nestjs/common';
import type { MC, Show, ShowMC, StudioMc } from '@prisma/client';

import type { PerformanceGroupItem, PnlGroupItem, ShowEconomics } from './schemas/studio-economics.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowMcRepository } from '@/models/show-mc/show-mc.repository';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { StudioMcRepository } from '@/models/studio-mc/studio-mc.repository';
import { StudioShiftRepository } from '@/models/studio-shift/studio-shift.repository';

@Injectable()
export class StudioEconomicsService {
  constructor(
    private readonly showService: ShowService,
    private readonly showRepository: ShowRepository,
    private readonly showMcRepository: ShowMcRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly studioMcRepository: StudioMcRepository,
    private readonly studioShiftRepository: StudioShiftRepository,
  ) {}

  // ─────────────────────────────────────────────
  // F4.3: Per-show economics
  // ─────────────────────────────────────────────

  async getShowEconomics(studioUid: string, showUid: string): Promise<ShowEconomics> {
    const show = await this.showService.getShowById(showUid, { studio: true });
    if (show.studio?.uid !== studioUid) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }

    const showMcs = await this.showMcRepository.findMany({ where: { showId: show.id, deletedAt: null }, include: { mc: true } });

    const studioMcDefaultsByMcId = await this.resolveStudioMcDefaults(show.studioId, showMcs);
    const mcCost = computeMcCost(showMcs, 0, studioMcDefaultsByMcId);

    const shiftCost = show.studio?.uid
      ? await this.computeShiftCostByStudioUid(show.studio.uid, show.startTime, show.endTime)
      : 0;

    const totalVariableCost = mcCost + shiftCost;

    return {
      show_id: show.uid,
      mc_cost: mcCost.toFixed(2),
      shift_cost: shiftCost.toFixed(2),
      total_variable_cost: totalVariableCost.toFixed(2),
    };
  }

  // ─────────────────────────────────────────────
  // F4.4: P&L views (grouped)
  // ─────────────────────────────────────────────

  async getPnlView(
    studioUid: string,
    groupBy: 'show' | 'schedule' | 'client',
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{ items: PnlGroupItem[]; summary: Omit<PnlGroupItem, 'group_id' | 'group_name'> }> {
    const shows = await this.showRepository.findByStudioAndDateRange(
      studioUid,
      dateFrom,
      dateTo,
      { Schedule: { select: { uid: true } }, client: { select: { uid: true } } },
    ) as ShowWithGroupingKeys[];
    if (shows.length === 0) {
      return { items: [], summary: this.emptyPnlSummary() };
    }

    const showIds = shows.map((s) => s.id);
    const studioId = shows[0]?.studioId;

    const [allShowMcs, allShifts] = await Promise.all([
      this.showMcRepository.findMany({ where: { showId: { in: showIds }, deletedAt: null }, include: { mc: true } }),
      studioId
        ? this.studioShiftRepository.findByShowWindow(studioId, dateFrom, dateTo)
        : Promise.resolve([]),
    ]);
    const studioMcDefaultsByMcId = await this.resolveStudioMcDefaults(studioId ?? null, allShowMcs);

    const mcsByShow = groupByField(allShowMcs, 'showId');
    const totalShiftCost = allShifts.reduce((sum, s) => sum + Number(s.calculatedCost ?? s.projectedCost), 0);

    const groups = new Map<string, { group_id: string | null; group_name: string | null; show_count: number; mc_cost: number }>();

    for (const show of shows) {
      const groupId = resolveGroupId(show, groupBy);
      const key = groupId ?? '__null';
      const existing = groups.get(key) ?? {
        group_id: groupId,
        group_name: resolveGroupName(show, groupBy),
        show_count: 0,
        mc_cost: 0,
      };
      const showMcs = mcsByShow.get(show.id) ?? [];
      existing.mc_cost += computeMcCost(showMcs, 0, studioMcDefaultsByMcId);
      existing.show_count += 1;
      groups.set(key, existing);
    }

    const shiftCostPerShow = totalShiftCost / shows.length;
    const items: PnlGroupItem[] = [];
    let summaryMcCost = 0;
    let summaryShowCount = 0;

    for (const g of groups.values()) {
      const groupShiftCost = shiftCostPerShow * g.show_count;
      items.push({
        group_id: g.group_id,
        group_name: g.group_name,
        show_count: g.show_count,
        total_mc_cost: g.mc_cost.toFixed(2),
        total_shift_cost: groupShiftCost.toFixed(2),
      });
      summaryMcCost += g.mc_cost;
      summaryShowCount += g.show_count;
    }

    return {
      items,
      summary: {
        show_count: summaryShowCount,
        total_mc_cost: summaryMcCost.toFixed(2),
        total_shift_cost: totalShiftCost.toFixed(2),
      },
    };
  }

  // ─────────────────────────────────────────────
  // F4.5: Performance views (grouped)
  // ─────────────────────────────────────────────

  async getPerformanceView(
    studioUid: string,
    groupBy: 'show' | 'schedule' | 'client',
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{ items: PerformanceGroupItem[]; summary: Omit<PerformanceGroupItem, 'group_id' | 'group_name'> }> {
    const shows = await this.showRepository.findByStudioAndDateRange(
      studioUid,
      dateFrom,
      dateTo,
      { Schedule: { select: { uid: true } }, client: { select: { uid: true } } },
    ) as ShowWithGroupingKeys[];
    if (shows.length === 0) {
      return { items: [], summary: this.emptyPerformanceSummary() };
    }

    const showIds = shows.map((s) => s.id);
    const allPlatforms = await this.showPlatformRepository.findByShowIds(showIds);
    const platformsByShow = groupByField(allPlatforms, 'showId');

    const groups = new Map<string, {
      group_id: string | null;
      group_name: string | null;
      show_count: number;
      total_viewer_count: number;
    }>();

    for (const show of shows) {
      const groupId = resolveGroupId(show, groupBy);
      const key = groupId ?? '__null';
      const existing = groups.get(key) ?? {
        group_id: groupId,
        group_name: resolveGroupName(show, groupBy),
        show_count: 0,
        total_viewer_count: 0,
      };

      const platforms = platformsByShow.get(show.id) ?? [];
      for (const sp of platforms) {
        existing.total_viewer_count += sp.viewerCount ?? 0;
      }
      existing.show_count += 1;
      groups.set(key, existing);
    }

    const items: PerformanceGroupItem[] = Array.from(groups.values()).map((g) => ({
      group_id: g.group_id,
      group_name: g.group_name,
      show_count: g.show_count,
      total_viewer_count: g.total_viewer_count,
    }));

    const summary = items.reduce(
      (acc, item) => ({
        show_count: acc.show_count + item.show_count,
        total_viewer_count: acc.total_viewer_count + item.total_viewer_count,
      }),
      { show_count: 0, total_viewer_count: 0 },
    );

    return { items, summary };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private async computeShiftCostByStudioUid(studioUid: string, from: Date, to: Date): Promise<number> {
    const shifts = await this.studioShiftRepository.findByStudioAndBlockWindow({
      studioUid,
      start: from,
      end: to,
    });
    return shifts.reduce((sum, s) => sum + Number(s.calculatedCost ?? s.projectedCost), 0);
  }

  private emptyPnlSummary() {
    return {
      show_count: 0,
      total_mc_cost: '0.00',
      total_shift_cost: '0.00',
    };
  }

  private emptyPerformanceSummary() {
    return {
      show_count: 0,
      total_viewer_count: 0,
    };
  }

  private async resolveStudioMcDefaults(
    studioId: bigint | null,
    showMcs: ShowMcWithMc[],
  ): Promise<Map<bigint, StudioMcDefaults>> {
    if (!studioId || showMcs.length === 0) {
      return new Map();
    }

    const mcIds = Array.from(new Set(showMcs.map((sm) => sm.mcId)));
    const defaults = await this.studioMcRepository.findDefaultsByStudioIdAndMcIds(studioId, mcIds);

    return new Map(defaults.map((item) => [item.mcId, item]));
  }
}

type ShowMcWithMc = ShowMC & { mc?: Pick<MC, 'defaultRateType' | 'defaultRate' | 'defaultCommissionRate'> | null };
type StudioMcDefaults = Pick<StudioMc, 'mcId' | 'defaultRateType' | 'defaultRate' | 'defaultCommissionRate'>;
type ShowWithGroupingKeys = Show & {
  Schedule?: { uid: string } | null;
  client?: { uid: string } | null;
};

/**
 * Compensation calculation rules:
 * - FIXED: fixed amount only (agreedRate -> defaultRate fallback)
 * - COMMISSION: revenue percentage only (commissionRate -> defaultCommissionRate fallback)
 * - HYBRID: fixed amount + revenue percentage
 */
export function computeMcCost(
  showMcs: ShowMcWithMc[],
  revenue: number,
  studioMcDefaultsByMcId: Map<bigint, StudioMcDefaults> = new Map(),
): number {
  return showMcs.reduce((sum, sm) => {
    const studioDefaults = studioMcDefaultsByMcId.get(sm.mcId);
    const type = sm.compensationType ?? studioDefaults?.defaultRateType ?? sm.mc?.defaultRateType ?? null;
    const fixedRate = sm.agreedRate ?? studioDefaults?.defaultRate ?? sm.mc?.defaultRate ?? null;
    const commissionRate = sm.commissionRate ?? studioDefaults?.defaultCommissionRate ?? sm.mc?.defaultCommissionRate ?? null;

    if (type === 'COMMISSION') {
      return sum + (commissionRate ? (revenue * Number(commissionRate)) / 100 : 0);
    }

    if (type === 'HYBRID') {
      const fixedComponent = fixedRate ? Number(fixedRate) : 0;
      const commissionComponent = commissionRate ? (revenue * Number(commissionRate)) / 100 : 0;
      return sum + fixedComponent + commissionComponent;
    }

    return sum + (fixedRate ? Number(fixedRate) : 0);
  }, 0);
}

function resolveGroupId(show: ShowWithGroupingKeys, groupBy: 'show' | 'schedule' | 'client'): string | null {
  if (groupBy === 'schedule')
    return show.Schedule?.uid ?? null;
  if (groupBy === 'client')
    return show.client?.uid ?? null;
  return show.uid;
}

function resolveGroupName(show: Pick<Show, 'name'>, groupBy: 'show' | 'schedule' | 'client'): string | null {
  if (groupBy === 'show')
    return show.name;
  return null;
}

function groupByField<T extends Record<string, any>>(items: T[], field: keyof T): Map<T[keyof T], T[]> {
  const map = new Map<T[keyof T], T[]>();
  for (const item of items) {
    const key = item[field] as T[keyof T];
    if (!map.has(key))
      map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
