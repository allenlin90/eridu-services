import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import type { ShiftAlignmentQuery } from '@/models/studio-shift/schemas/studio-shift.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

type ShiftWithBlocks = Awaited<ReturnType<StudioShiftService['findShiftsInWindow']>>[number];
type ShowWithAssignments = Prisma.ShowGetPayload<{
  include: {
    showMCs: {
      include: {
        mc: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

type TimeInterval = { start: Date; end: Date };

@Injectable()
export class ShiftAlignmentService {
  private static readonly DEFAULT_WINDOW_DAYS = 7;

  constructor(
    private readonly studioService: StudioService,
    private readonly studioShiftService: StudioShiftService,
    private readonly showService: ShowService,
    private readonly studioMembershipService: StudioMembershipService,
  ) {}

  async getAlignment(studioUid: string, query: ShiftAlignmentQuery) {
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    const window = this.resolveWindow(query.dateFrom, query.dateTo);
    const now = new Date();
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
          showMCs: {
            where: { deletedAt: null },
            include: {
              mc: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const shiftIntervalsByUser = this.indexShiftIntervalsByUser(shifts, window.start, window.end);
    const studioMemberUserIds = await this.getStudioMemberUserIds(studioUid);
    const idleSegments: Array<{
      show_id: string;
      show_name: string;
      user_id: string;
      user_name: string;
      segment_start: string;
      segment_end: string;
      duration_minutes: number;
    }> = [];
    const missingShiftAssignments: Array<{
      show_id: string;
      show_name: string;
      user_id: string;
      user_name: string;
      show_start: string;
      show_end: string;
    }> = [];

    let assignedMembersChecked = 0;
    let showsChecked = 0;

    for (const show of shows as ShowWithAssignments[]) {
      const showWindow = this.clipInterval(show.startTime, show.endTime, window.start, window.end);
      if (!showWindow) {
        continue;
      }
      if (showWindow.end <= now) {
        continue;
      }

      showsChecked += 1;

      const assignedUsers = this.getAssignedUsers(show)
        .filter((assignedUser) => studioMemberUserIds.has(assignedUser.userId));
      for (const assignedUser of assignedUsers) {
        assignedMembersChecked += 1;
        const userIntervals = shiftIntervalsByUser.get(assignedUser.userId) ?? [];
        const overlappingIntervals = userIntervals
          .map((interval) => this.clipInterval(interval.start, interval.end, showWindow.start, showWindow.end))
          .filter((interval): interval is TimeInterval => Boolean(interval));

        if (overlappingIntervals.length === 0) {
          missingShiftAssignments.push({
            show_id: show.uid,
            show_name: show.name,
            user_id: assignedUser.userId,
            user_name: assignedUser.userName,
            show_start: showWindow.start.toISOString(),
            show_end: showWindow.end.toISOString(),
          });
          continue;
        }

        const gaps = this.findGaps(showWindow, overlappingIntervals);
        for (const gap of gaps) {
          idleSegments.push({
            show_id: show.uid,
            show_name: show.name,
            user_id: assignedUser.userId,
            user_name: assignedUser.userName,
            segment_start: gap.start.toISOString(),
            segment_end: gap.end.toISOString(),
            duration_minutes: Math.floor((gap.end.getTime() - gap.start.getTime()) / (1000 * 60)),
          });
        }
      }
    }

    return {
      period: {
        date_from: window.start.toISOString(),
        date_to: window.end.toISOString(),
      },
      summary: {
        shows_checked: showsChecked,
        assigned_members_checked: assignedMembersChecked,
        idle_segments_count: idleSegments.length,
        missing_shift_count: missingShiftAssignments.length,
      },
      idle_segments: idleSegments,
      missing_shift_assignments: missingShiftAssignments,
    };
  }

  private indexShiftIntervalsByUser(
    shifts: ShiftWithBlocks[],
    rangeStart: Date,
    rangeEnd: Date,
  ): Map<string, TimeInterval[]> {
    const map = new Map<string, TimeInterval[]>();

    for (const shift of shifts) {
      const userId = shift.user.uid;
      if (!map.has(userId)) {
        map.set(userId, []);
      }

      const userIntervals = map.get(userId)!;
      for (const block of shift.blocks) {
        const clipped = this.clipInterval(block.startTime, block.endTime, rangeStart, rangeEnd);
        if (!clipped) {
          continue;
        }
        userIntervals.push(clipped);
      }
    }

    for (const [userId, intervals] of map.entries()) {
      map.set(userId, this.mergeIntervals(intervals));
    }

    return map;
  }

  private getAssignedUsers(show: ShowWithAssignments): Array<{ userId: string; userName: string }> {
    const unique = new Map<string, string>();

    for (const showMC of show.showMCs ?? []) {
      const user = showMC.mc?.user;
      if (!user?.uid) {
        continue;
      }
      unique.set(user.uid, user.name ?? user.uid);
    }

    return [...unique.entries()].map(([userId, userName]) => ({ userId, userName }));
  }

  private async getStudioMemberUserIds(studioUid: string): Promise<Set<string>> {
    const pageSize = 500;
    let skip = 0;
    const memberUserIds = new Set<string>();

    while (true) {
      const memberships = await this.studioMembershipService.listStudioMemberships<{ user: true }>({
        studioId: studioUid,
        skip,
        take: pageSize,
      }, {
        user: true,
      });

      for (const membership of memberships.data) {
        const userUid = 'user' in membership ? membership.user?.uid : undefined;
        if (userUid) {
          memberUserIds.add(userUid);
        }
      }

      if (memberships.data.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    return memberUserIds;
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
