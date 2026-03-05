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
  projected_cost: string;
  calculated_cost: string | null;
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
  total_projected_cost: string;
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
  total_projected_cost: string;
  total_calculated_cost: string;
};

@Injectable()
export class ShiftCalendarService {
  private static readonly DEFAULT_WINDOW_DAYS = 7;

  constructor(
    private readonly studioService: StudioService,
    private readonly studioShiftService: StudioShiftService,
  ) {}

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
    const dayMap = new Map<string, Map<string, {
      user_id: string;
      user_name: string;
      total_hours: number;
      projected_cost_acc: number;
      shifts: Map<string, DayShift>;
    }>>();

    let totalHours = 0;
    let totalProjectedCost = 0;
    let totalCalculatedCost = 0;
    let totalBlockCount = 0;

    const shiftIds = new Set<string>();

    for (const shift of shifts) {
      shiftIds.add(shift.uid);
      const hourlyRate = this.toNumber(shift.hourlyRate);
      const shiftBlocks = shift.blocks ?? [];
      const shiftTotalBlockHours = shiftBlocks.reduce(
        (acc, block) => acc + this.hoursBetween(block.startTime, block.endTime),
        0,
      );

      let shiftOverlapHours = 0;

      for (const block of shiftBlocks) {
        const clipped = this.clipInterval(block.startTime, block.endTime, rangeStart, rangeEnd);
        if (!clipped) {
          continue;
        }

        totalBlockCount += 1;
        const clippedHours = this.hoursBetween(clipped.start, clipped.end);
        shiftOverlapHours += clippedHours;

        const segments = this.splitIntervalByDay(clipped.start, clipped.end);
        for (const segment of segments) {
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
              projected_cost_acc: 0,
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
              projected_cost: '0.00',
              calculated_cost: shift.calculatedCost ? this.formatMoney(this.toNumber(shift.calculatedCost)) : null,
              total_hours: 0,
              blocks: [],
            });
          }

          const dayShift = dayUser.shifts.get(shift.uid)!;
          const segmentHours = this.hoursBetween(segment.start, segment.end);

          dayShift.total_hours += segmentHours;
          dayShift.blocks.push({
            block_id: block.uid,
            start_time: segment.start.toISOString(),
            end_time: segment.end.toISOString(),
            duration_hours: segmentHours,
          });

          dayUser.total_hours += segmentHours;
          dayUser.projected_cost_acc += segmentHours * hourlyRate;
        }
      }

      totalHours += shiftOverlapHours;
      totalProjectedCost += shiftOverlapHours * hourlyRate;

      if (shift.calculatedCost && shiftTotalBlockHours > 0) {
        const calculatedRate = this.toNumber(shift.calculatedCost) / shiftTotalBlockHours;
        totalCalculatedCost += shiftOverlapHours * calculatedRate;
      }
    }

    const timeline = [...dayMap.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, usersMap]) => {
        const users = [...usersMap.values()]
          .map((user) => {
            const shiftsForDay = [...user.shifts.values()]
              .map((shift) => ({
                ...shift,
                total_hours: this.roundHours(shift.total_hours),
                projected_cost: this.formatMoney(this.toNumber(shift.hourly_rate) * shift.total_hours),
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
              total_projected_cost: this.formatMoney(user.projected_cost_acc),
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
        total_projected_cost: this.formatMoney(totalProjectedCost),
        total_calculated_cost: this.formatMoney(totalCalculatedCost),
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
      const nextMidnight = new Date(cursor);
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const segmentEnd = new Date(Math.min(nextMidnight.getTime(), end.getTime()));
      segments.push({ start: new Date(cursor), end: segmentEnd });
      cursor = segmentEnd;
    }

    return segments;
  }
}
