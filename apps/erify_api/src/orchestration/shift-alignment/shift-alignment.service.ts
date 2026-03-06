import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import type { ShiftAlignmentQuery } from '@/models/studio-shift/schemas/studio-shift.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { TaskService } from '@/models/task/task.service';

type ShiftWithBlocks = Awaited<ReturnType<StudioShiftService['findShiftsInWindow']>>[number];
type ShowWithPlanningContext = {
  id: bigint;
  uid: string;
  name: string;
  startTime: Date;
  endTime: Date;
  showStandard: { name: string } | null;
};
type TaskWithTargets = Awaited<ReturnType<TaskService['findTasksByShowIds']>>[number];

type TimeInterval = { start: Date; end: Date };
type ShowWindow = {
  id: bigint;
  uid: string;
  name: string;
  standardName: string;
  start: Date;
  end: Date;
  operationalDay: string;
};

type OperationalDayBucket = {
  firstShowStart: Date;
  lastShowEnd: Date;
  shows: ShowWindow[];
};

const REQUIRED_SHOW_TASK_TYPES = ['SETUP', 'ACTIVE', 'CLOSURE'] as const;
type RequiredTaskType = (typeof REQUIRED_SHOW_TASK_TYPES)[number];

// Convention: shows whose standard name equals this value require a moderation task.
const PREMIUM_SHOW_STANDARD_NAME = 'premium';

@Injectable()
export class ShiftAlignmentService {
  private static readonly DEFAULT_WINDOW_DAYS = 7;
  // Operational day is 06:00 -> 05:59 next calendar day.
  // This matches studio ops where after-midnight shows still belong to the prior workday.
  private static readonly OPERATIONAL_DAY_START_HOUR_UTC = 6;

  constructor(
    private readonly studioService: StudioService,
    private readonly studioShiftService: StudioShiftService,
    private readonly showService: ShowService,
    private readonly taskService: TaskService,
  ) {}

  /**
   * Planning-risk orchestration for studio admins.
   *
   * Purpose:
   * - Evaluate upcoming shows only (past shows are skipped).
   * - Detect duty-manager gaps during show windows and across each operational day.
   * - Detect show task-readiness gaps (missing required tasks / unassigned tasks / premium moderation).
   */
  async getAlignment(studioUid: string, query: ShiftAlignmentQuery) {
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    const window = this.resolveWindow(query.dateFrom, query.dateTo);
    const now = new Date();
    // Planning is forward-looking: never evaluate ended shows, even if date_from is in the past.
    const planningStart = new Date(Math.max(window.start.getTime(), now.getTime()));

    const [shifts, shows] = await Promise.all([
      this.studioShiftService.findShiftsInWindow({
        studioUid,
        start: window.start,
        end: window.end,
        includeCancelled: query.includeCancelled,
      }),
      this.showService.findMany({
        where: {
          studio: { uid: studioUid, deletedAt: null },
          deletedAt: null,
          startTime: { lt: window.end },
          endTime: { gt: planningStart },
        },
        orderBy: { startTime: 'asc' },
        include: {
          showStandard: true,
        },
      }),
    ]);

    const dutyManagerIntervals = this.collectDutyManagerIntervals(shifts, window.start, window.end);
    const showWindows = this.buildShowWindows(shows as unknown as ShowWithPlanningContext[], window.start, window.end, now);
    const operationalDays = this.groupShowsByOperationalDay(showWindows);
    const taskMapByShowId = await this.buildTaskMapByShowId(showWindows);

    const dutyManagerUncoveredSegments: Array<{
      operational_day: string;
      segment_start: string;
      segment_end: string;
      duration_minutes: number;
      first_show_start: string;
      last_show_end: string;
    }> = [];
    const dutyManagerMissingShows: Array<{
      show_id: string;
      show_name: string;
      show_start: string;
      show_end: string;
      operational_day: string;
    }> = [];
    const taskReadinessWarnings: Array<{
      show_id: string;
      show_name: string;
      show_start: string;
      show_end: string;
      operational_day: string;
      show_standard: string;
      has_no_tasks: boolean;
      unassigned_task_count: number;
      missing_required_task_types: RequiredTaskType[];
      missing_moderation_task: boolean;
    }> = [];

    // Secondary awareness metric: continuity from first show start to last show end in each operational day.
    for (const [operationalDay, bucket] of operationalDays.entries()) {
      const showDayWindow = { start: bucket.firstShowStart, end: bucket.lastShowEnd };
      const dayOverlaps = dutyManagerIntervals
        .map((interval) => this.clipInterval(interval.start, interval.end, showDayWindow.start, showDayWindow.end))
        .filter((interval): interval is TimeInterval => Boolean(interval));
      const dayGaps = this.findGaps(showDayWindow, dayOverlaps);

      for (const gap of dayGaps) {
        dutyManagerUncoveredSegments.push({
          operational_day: operationalDay,
          segment_start: gap.start.toISOString(),
          segment_end: gap.end.toISOString(),
          duration_minutes: Math.floor((gap.end.getTime() - gap.start.getTime()) / (1000 * 60)),
          first_show_start: bucket.firstShowStart.toISOString(),
          last_show_end: bucket.lastShowEnd.toISOString(),
        });
      }
    }

    // Primary risk check: at least one duty manager must overlap each show window.
    // Task readiness checks are also evaluated per show.
    for (const show of showWindows) {
      const showDutyOverlaps = dutyManagerIntervals
        .map((interval) => this.clipInterval(interval.start, interval.end, show.start, show.end))
        .filter((interval): interval is TimeInterval => Boolean(interval));

      if (showDutyOverlaps.length === 0) {
        dutyManagerMissingShows.push({
          show_id: show.uid,
          show_name: show.name,
          show_start: show.start.toISOString(),
          show_end: show.end.toISOString(),
          operational_day: show.operationalDay,
        });
      }

      const tasks = taskMapByShowId.get(show.id) ?? [];
      const hasNoTasks = tasks.length === 0;
      const unassignedTaskCount = tasks.filter((task) => task.assigneeId === null).length;
      const missingRequiredTaskTypes = hasNoTasks
        ? REQUIRED_SHOW_TASK_TYPES.map((type) => type as 'SETUP' | 'ACTIVE' | 'CLOSURE')
        : (() => {
            const presentTypes = new Set(tasks.map((task) => task.type));
            return REQUIRED_SHOW_TASK_TYPES
              .filter((requiredType) => !presentTypes.has(requiredType))
              .map((type) => type as 'SETUP' | 'ACTIVE' | 'CLOSURE');
          })();

      // Premium shows require at least one moderation task.
      const isPremiumShow = show.standardName.toLowerCase() === PREMIUM_SHOW_STANDARD_NAME;
      const hasModerationTask = tasks.some((task) => this.isModerationTask(task));
      const missingModerationTask = isPremiumShow && !hasModerationTask;

      if (hasNoTasks || unassignedTaskCount > 0 || missingRequiredTaskTypes.length > 0 || missingModerationTask) {
        taskReadinessWarnings.push({
          show_id: show.uid,
          show_name: show.name,
          show_start: show.start.toISOString(),
          show_end: show.end.toISOString(),
          operational_day: show.operationalDay,
          show_standard: show.standardName,
          has_no_tasks: hasNoTasks,
          unassigned_task_count: unassignedTaskCount,
          missing_required_task_types: missingRequiredTaskTypes,
          missing_moderation_task: missingModerationTask,
        });
      }
    }

    const showsWithoutDutyManagerIds = new Set(dutyManagerMissingShows.map((item) => item.show_id));
    const taskWarningShowIds = new Set(taskReadinessWarnings.map((item) => item.show_id));
    const riskShowCount = new Set([...showsWithoutDutyManagerIds, ...taskWarningShowIds]).size;

    return {
      period: {
        date_from: window.start.toISOString(),
        date_to: window.end.toISOString(),
      },
      summary: {
        shows_checked: showWindows.length,
        operational_days_checked: operationalDays.size,
        risk_show_count: riskShowCount,
        shows_without_duty_manager_count: dutyManagerMissingShows.length,
        operational_days_without_duty_manager_count: new Set(
          dutyManagerUncoveredSegments.map((segment) => segment.operational_day),
        ).size,
        shows_without_tasks_count: taskReadinessWarnings.filter((warning) => warning.has_no_tasks).length,
        shows_with_unassigned_tasks_count: taskReadinessWarnings.filter((warning) => warning.unassigned_task_count > 0).length,
        tasks_unassigned_count: taskReadinessWarnings.reduce((sum, warning) => sum + warning.unassigned_task_count, 0),
        shows_missing_required_tasks_count: taskReadinessWarnings.filter(
          (warning) => warning.missing_required_task_types.length > 0,
        ).length,
        premium_shows_missing_moderation_count: taskReadinessWarnings.filter(
          (warning) => warning.missing_moderation_task,
        ).length,
      },
      duty_manager_uncovered_segments: dutyManagerUncoveredSegments,
      duty_manager_missing_shows: dutyManagerMissingShows,
      task_readiness_warnings: taskReadinessWarnings,
    };
  }

  private collectDutyManagerIntervals(
    shifts: ShiftWithBlocks[],
    rangeStart: Date,
    rangeEnd: Date,
  ): TimeInterval[] {
    const intervals: TimeInterval[] = [];

    for (const shift of shifts) {
      // Only active duty-manager shifts contribute to coverage.
      if (!shift.isDutyManager || shift.status === 'CANCELLED') {
        continue;
      }

      for (const block of shift.blocks) {
        const clipped = this.clipInterval(block.startTime, block.endTime, rangeStart, rangeEnd);
        if (!clipped) {
          continue;
        }
        intervals.push(clipped);
      }
    }

    return this.mergeIntervals(intervals);
  }

  private buildShowWindows(
    shows: ShowWithPlanningContext[],
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
  ): ShowWindow[] {
    const windows: ShowWindow[] = [];

    for (const show of shows) {
      const clipped = this.clipInterval(show.startTime, show.endTime, rangeStart, rangeEnd);
      if (!clipped || clipped.end <= now) {
        continue;
      }

      windows.push({
        id: show.id,
        uid: show.uid,
        name: show.name,
        standardName: show.showStandard?.name ?? 'standard',
        start: clipped.start,
        end: clipped.end,
        operationalDay: this.toOperationalDay(clipped.start),
      });
    }

    return windows;
  }

  private groupShowsByOperationalDay(shows: ShowWindow[]): Map<string, OperationalDayBucket> {
    const map = new Map<string, OperationalDayBucket>();

    for (const show of shows) {
      if (!map.has(show.operationalDay)) {
        map.set(show.operationalDay, {
          firstShowStart: show.start,
          lastShowEnd: show.end,
          shows: [show],
        });
        continue;
      }

      const bucket = map.get(show.operationalDay)!;
      if (show.start < bucket.firstShowStart) {
        bucket.firstShowStart = show.start;
      }
      if (show.end > bucket.lastShowEnd) {
        bucket.lastShowEnd = show.end;
      }
      bucket.shows.push(show);
    }

    return map;
  }

  private async buildTaskMapByShowId(showWindows: ShowWindow[]): Promise<Map<bigint, TaskWithTargets[]>> {
    const map = new Map<bigint, TaskWithTargets[]>();
    if (showWindows.length === 0) {
      return map;
    }

    const showIds = showWindows.map((show) => show.id);
    // Include template for moderation detection and targets for show association.
    const tasks = await this.taskService.findTasksByShowIds(showIds, {
      targets: true,
      template: true,
    });

    for (const task of tasks) {
      for (const target of task.targets ?? []) {
        if (target.targetType !== 'SHOW' || target.deletedAt || !target.showId) {
          continue;
        }

        if (!map.has(target.showId)) {
          map.set(target.showId, []);
        }
        map.get(target.showId)!.push(task);
      }
    }

    return map;
  }

  private isModerationTask(task: TaskWithTargets): boolean {
    const moderationPattern = /moderation/i;
    return moderationPattern.test(task.description ?? '') || moderationPattern.test(task.template?.name ?? '');
  }

  private toOperationalDay(value: Date): string {
    const date = new Date(value);
    // Shows before 06:00 are attributed to the previous operational day.
    if (date.getUTCHours() < ShiftAlignmentService.OPERATIONAL_DAY_START_HOUR_UTC) {
      date.setUTCDate(date.getUTCDate() - 1);
    }
    return date.toISOString().slice(0, 10);
  }

  private findGaps(window: TimeInterval, intervals: TimeInterval[]): TimeInterval[] {
    const merged = this.mergeIntervals(intervals);
    const gaps: TimeInterval[] = [];
    let cursor = window.start;

    for (const interval of merged) {
      if (interval.start > cursor) {
        gaps.push({ start: cursor, end: interval.start });
      }
      if (interval.end > cursor) {
        cursor = interval.end;
      }
    }

    if (cursor < window.end) {
      gaps.push({ start: cursor, end: window.end });
    }

    return gaps.filter((gap) => gap.end.getTime() > gap.start.getTime());
  }

  private mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
    if (intervals.length === 0) {
      return [];
    }

    const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: TimeInterval[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i];
      const previous = merged[merged.length - 1];
      if (current.start <= previous.end) {
        previous.end = new Date(Math.max(previous.end.getTime(), current.end.getTime()));
      } else {
        merged.push({ ...current });
      }
    }

    return merged;
  }

  private resolveWindow(dateFrom?: Date, dateTo?: Date): { start: Date; end: Date } {
    const now = new Date();
    const start = dateFrom ? this.startOfDay(dateFrom) : this.startOfDay(now);
    const end = dateTo
      ? this.endOfDay(dateTo)
      : this.endOfDay(new Date(start.getTime() + ((ShiftAlignmentService.DEFAULT_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000)));

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

  private clipInterval(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): TimeInterval | null {
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
}
