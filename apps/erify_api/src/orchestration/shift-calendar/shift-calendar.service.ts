import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import type { ShiftCalendarQuery } from '@/models/studio-shift/schemas/studio-shift.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

type ShiftWithBlocks = Awaited<ReturnType<StudioShiftService['findShiftsInWindow']>>[number];

type DayShift = {
  shift_id: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  is_duty_manager: boolean;
  hourly_rate: string;
  planned_cost: string;
  actual_cost: string | null;
  total_hours: number;
  blocks: Array<{
    block_id: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
  }>;
};

type DayUser = {
  user_id: string;
  user_name: string;
  total_hours: number;
  total_planned_cost: string;
  shifts: DayShift[];
};

type CalendarTimelineDay = {
  date: string;
  users: DayUser[];
};

type CalendarSummary = {
  shift_count: number;
  block_count: number;
  total_hours: number;
  total_planned_cost: string;
  total_actual_cost: string;
  actual_cost_resolved_shift_count: number;
  actual_cost_pending_shift_count: number;
};

@Injectable()
export class ShiftCalendarService {
  private static readonly DEFAULT_WINDOW_DAYS = 7;

  constructor(
    private readonly studioService: StudioService,
    private readonly studioShiftService: StudioShiftService,
  ) {}

  /**
   * Calendar/cost orchestration for studio-admin planning.
   *
   * Cost figures are live-computed from current shift inputs (cost-model:
   * `StudioShift.projected_cost` removed). Per-shift and rollups use clipped
   * block durations against the calendar window for hours-based aggregation.
   * Compensation line items are intentionally excluded from this surface in
   * Phase 4 PR 3 — the studio-shifts table at /shifts is the canonical
   * line-item-inclusive total. If the calendar later needs to mirror that,
   * pro-rate line items per shift's window overlap as the extension point.
   */
  async getCalendar(studioUid: string, query: ShiftCalendarQuery) {
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    const window = this.resolveWindow(query.dateFrom, query.dateTo);
    const shifts = await this.studioShiftService.findShiftsInWindow({
      studioUid,
      start: window.start,
      end: window.end,
      includeCancelled: query.includeCancelled,
    });

    const { timeline, summary } = this.buildCalendar(shifts, window.start, window.end);

    return {
      period: {
        date_from: window.start.toISOString(),
        date_to: window.end.toISOString(),
      },
      summary,
      timeline,
    };
  }

  private buildCalendar(
    shifts: ShiftWithBlocks[],
    rangeStart: Date,
    rangeEnd: Date,
  ): {
      timeline: CalendarTimelineDay[];
      summary: CalendarSummary;
    } {
    // date -> user -> shifts accumulator.
    const dayMap = new Map<string, Map<string, {
      user_id: string;
      user_name: string;
      total_hours: number;
      planned_cost_acc: number;
      shifts: Map<string, DayShift & { actual_cost_acc: number }>;
    }>>();

    let totalHours = 0;
    let totalPlannedCost = 0;
    let totalActualCost = 0;
    let totalBlockCount = 0;

    const shiftIds = new Set<string>();
    let resolvedShiftCount = 0;
    let pendingShiftCount = 0;

    for (const shift of shifts) {
      shiftIds.add(shift.uid);
      const hourlyRate = this.toNumber(shift.hourlyRate);
      // ALL blocks of the shift (not just in-window) — needed so a shift with one
      // out-of-window incomplete block is correctly classified as pending shift-wide.
      // Per-block window clipping happens below via `clipInterval`.
      const shiftBlocks = shift.blocks ?? [];

      // Shift-wide actual completeness — used to null per-shift `actual_cost` and to
      // count resolved/pending. A shift is "resolved" when every block on the shift
      // has both actualStartTime AND actualEndTime, even blocks outside the visible
      // window. Strict-null per cost-model §2.
      const shiftHasCompleteActuals = shiftBlocks.length > 0
        && shiftBlocks.every((block) => block.actualStartTime !== null && block.actualEndTime !== null);
      if (shiftHasCompleteActuals) {
        resolvedShiftCount += 1;
      } else {
        pendingShiftCount += 1;
      }

      for (const block of shiftBlocks) {
        const clipped = this.clipInterval(block.startTime, block.endTime, rangeStart, rangeEnd);
        if (!clipped) {
          continue;
        }

        totalBlockCount += 1;

        // Split planned cross-midnight blocks so each segment is aggregated into the correct day bucket.
        const plannedSegments = this.splitIntervalByDay(clipped.start, clipped.end);
        for (const segment of plannedSegments) {
          const dateKey = this.toDateKey(segment.start);

          if (!dayMap.has(dateKey)) {
            dayMap.set(dateKey, new Map());
          }

          const userMap = dayMap.get(dateKey)!;
          if (!userMap.has(shift.user.uid)) {
            userMap.set(shift.user.uid, {
              user_id: shift.user.uid,
              user_name: shift.user.name,
              total_hours: 0,
              planned_cost_acc: 0,
              shifts: new Map(),
            });
          }

          const dayUser = userMap.get(shift.user.uid)!;
          if (!dayUser.shifts.has(shift.uid)) {
            dayUser.shifts.set(shift.uid, {
              shift_id: shift.uid,
              status: shift.status,
              is_duty_manager: shift.isDutyManager,
              hourly_rate: this.formatMoney(hourlyRate),
              planned_cost: '0.00',
              actual_cost: shiftHasCompleteActuals ? '0.00' : null,
              actual_cost_acc: 0,
              total_hours: 0,
              blocks: [],
            });
          }

          const dayShift = dayUser.shifts.get(shift.uid)!;
          const segmentHours = this.hoursBetween(segment.start, segment.end);
          const segmentPlannedCost = segmentHours * hourlyRate;

          dayShift.total_hours += segmentHours;
          dayShift.blocks.push({
            block_id: block.uid,
            start_time: segment.start.toISOString(),
            end_time: segment.end.toISOString(),
            duration_hours: segmentHours,
          });

          dayUser.total_hours += segmentHours;
          dayUser.planned_cost_acc += segmentPlannedCost;

          totalHours += segmentHours;
          totalPlannedCost += segmentPlannedCost;
        }

        // Actual cost is attributed to each day the actuals actually overlap — not pro-rated
        // by planned span — so a block whose actuals concentrate on one day of a cross-midnight
        // window doesn't bleed cost into the other day where no actual time was recorded.
        // Only contributes when the block has a complete actual pair AND the shift as a whole
        // is resolved (strict null when any block on the shift is pending).
        if (shiftHasCompleteActuals && block.actualStartTime !== null && block.actualEndTime !== null) {
          const clippedActual = this.clipInterval(
            block.actualStartTime,
            block.actualEndTime,
            rangeStart,
            rangeEnd,
          );
          if (clippedActual) {
            const actualSegments = this.splitIntervalByDay(clippedActual.start, clippedActual.end);
            for (const aSeg of actualSegments) {
              const aSegHours = this.hoursBetween(aSeg.start, aSeg.end);
              const aSegCost = aSegHours * hourlyRate;
              totalActualCost += aSegCost;

              // Attribute to the matching day-shift cell if it exists (i.e., the shift has
              // planned coverage on this day). If actuals leaked into a day with no planned
              // coverage, the cost still counts toward the period summary but isn't surfaced
              // in any per-day cell — there's no row to attach it to.
              const aDateKey = this.toDateKey(aSeg.start);
              const dayShift = dayMap.get(aDateKey)?.get(shift.user.uid)?.shifts.get(shift.uid);
              if (dayShift) {
                dayShift.actual_cost_acc += aSegCost;
              }
            }
          }
        }
      }
    }

    const timeline = [...dayMap.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, usersMap]) => {
        const users = [...usersMap.values()]
          .map((user) => {
            const shiftsForDay = [...user.shifts.values()]
              .map((shift) => ({
                shift_id: shift.shift_id,
                status: shift.status,
                is_duty_manager: shift.is_duty_manager,
                hourly_rate: shift.hourly_rate,
                planned_cost: this.formatMoney(this.toNumber(shift.hourly_rate) * shift.total_hours),
                actual_cost: shift.actual_cost === null
                  ? null
                  : this.formatMoney(shift.actual_cost_acc),
                total_hours: this.roundHours(shift.total_hours),
                blocks: shift.blocks
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map((block) => ({
                    ...block,
                    duration_hours: this.roundHours(block.duration_hours),
                  })),
              }))
              .sort((a, b) => {
                const aStart = a.blocks[0]?.start_time ?? '';
                const bStart = b.blocks[0]?.start_time ?? '';
                return aStart.localeCompare(bStart);
              });

            return {
              user_id: user.user_id,
              user_name: user.user_name,
              total_hours: this.roundHours(user.total_hours),
              total_planned_cost: this.formatMoney(user.planned_cost_acc),
              shifts: shiftsForDay,
            };
          })
          .sort((a, b) => a.user_name.localeCompare(b.user_name));

        return { date, users };
      });

    return {
      timeline,
      summary: {
        shift_count: shiftIds.size,
        block_count: totalBlockCount,
        total_hours: this.roundHours(totalHours),
        total_planned_cost: this.formatMoney(totalPlannedCost),
        total_actual_cost: this.formatMoney(totalActualCost),
        actual_cost_resolved_shift_count: resolvedShiftCount,
        actual_cost_pending_shift_count: pendingShiftCount,
      },
    };
  }

  private resolveWindow(dateFrom?: Date, dateTo?: Date): { start: Date; end: Date } {
    const now = new Date();

    const start = dateFrom
      ? this.startOfDay(dateFrom)
      : this.startOfDay(now);

    const end = dateTo
      ? this.endOfDay(dateTo)
      : this.endOfDay(new Date(start.getTime() + ((ShiftCalendarService.DEFAULT_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000)));

    if (end < start) {
      throw HttpError.badRequest('date_to must be on or after date_from');
    }

    return { start, end };
  }

  private startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
      return Number(value.toString());
    }
    return 0;
  }

  private formatMoney(value: number): string {
    return value.toFixed(2);
  }

  private hoursBetween(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private roundHours(value: number): number {
    return Number(value.toFixed(2));
  }

  private clipInterval(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): { start: Date; end: Date } | null {
    const clippedStartMs = Math.max(start.getTime(), rangeStart.getTime());
    const clippedEndMs = Math.min(end.getTime(), rangeEnd.getTime());
    if (clippedEndMs <= clippedStartMs) {
      return null;
    }
    return {
      start: new Date(clippedStartMs),
      end: new Date(clippedEndMs),
    };
  }

  private splitIntervalByDay(start: Date, end: Date): Array<{ start: Date; end: Date }> {
    const segments: Array<{ start: Date; end: Date }> = [];
    let cursor = new Date(start);

    while (cursor < end) {
      // UTC midnight boundary keeps API date keys and DB timestamps consistent.
      const nextMidnight = new Date(cursor);
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const segmentEnd = new Date(Math.min(nextMidnight.getTime(), end.getTime()));
      segments.push({ start: new Date(cursor), end: segmentEnd });
      cursor = segmentEnd;
    }

    return segments;
  }
}
