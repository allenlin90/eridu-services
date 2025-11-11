import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';

import {
  PlanDocument,
  ShowPlanItem,
  ValidationError,
  ValidationResult,
} from './schemas/schedule-planning.schema';

@Injectable()
export class ValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates an entire schedule including all shows in the plan document.
   *
   * @param schedule - The schedule to validate
   * @param tx - Optional transaction context
   * @returns Validation result with errors if any
   */
  async validateSchedule(
    schedule: {
      id: bigint;
      uid: string;
      startDate: Date;
      endDate: Date;
      planDocument: PlanDocument;
      clientId: bigint | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ValidationResult> {
    const prismaClient = tx || this.prisma;
    const errors: ValidationError[] = [];

    // Validate plan document structure
    if (
      !schedule.planDocument.shows ||
      !Array.isArray(schedule.planDocument.shows)
    ) {
      errors.push({
        type: 'reference_not_found',
        message: 'Plan document must contain a shows array',
      });
      return { isValid: false, errors };
    }

    const shows = schedule.planDocument.shows;
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);

    // Build UID lookup maps for all references
    const uidMaps = await this.buildUidLookupMaps(shows, prismaClient);

    // Validate each show
    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const showErrors = await this.validateShow(
        show,
        i,
        scheduleStart,
        scheduleEnd,
        uidMaps,
        prismaClient,
      );
      errors.push(...showErrors);
    }

    // Check for internal conflicts (room and MC double-booking within schedule)
    const conflictErrors = this.checkInternalConflicts(shows);
    errors.push(...conflictErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates an individual show plan item.
   */
  private async validateShow(
    show: ShowPlanItem,
    showIndex: number,
    scheduleStart: Date,
    scheduleEnd: Date,
    uidMaps: Awaited<ReturnType<typeof this.buildUidLookupMaps>>,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const startTime = new Date(show.startTime);
    const endTime = new Date(show.endTime);

    // Validate time range (endTime > startTime) - already validated by Zod, but check again
    if (endTime <= startTime) {
      errors.push({
        type: 'time_range',
        message: `Show end time must be after start time`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Validate show is within schedule date range
    if (startTime < scheduleStart || endTime > scheduleEnd) {
      errors.push({
        type: 'time_range',
        message: `Show time range must be within schedule date range (${scheduleStart.toISOString()} to ${scheduleEnd.toISOString()})`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Validate reference existence
    if (!uidMaps.clients.has(show.clientUid)) {
      errors.push({
        type: 'reference_not_found',
        message: `Client with UID ${show.clientUid} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.studioRooms.has(show.studioRoomUid)) {
      errors.push({
        type: 'reference_not_found',
        message: `Studio room with UID ${show.studioRoomUid} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.showTypes.has(show.showTypeUid)) {
      errors.push({
        type: 'reference_not_found',
        message: `Show type with UID ${show.showTypeUid} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.showStatuses.has(show.showStatusUid)) {
      errors.push({
        type: 'reference_not_found',
        message: `Show status with UID ${show.showStatusUid} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.showStandards.has(show.showStandardUid)) {
      errors.push({
        type: 'reference_not_found',
        message: `Show standard with UID ${show.showStandardUid} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Validate MCs
    for (const mc of show.mcs || []) {
      if (!uidMaps.mcs.has(mc.mcUid)) {
        errors.push({
          type: 'reference_not_found',
          message: `MC with UID ${mc.mcUid} not found`,
          showIndex,
          showTempId: show.tempId,
        });
      }
    }

    // Validate platforms
    for (const platform of show.platforms || []) {
      if (!uidMaps.platforms.has(platform.platformUid)) {
        errors.push({
          type: 'reference_not_found',
          message: `Platform with UID ${platform.platformUid} not found`,
          showIndex,
          showTempId: show.tempId,
        });
      }
    }

    // Check room availability (conflicts with existing shows)
    const roomConflicts = await this.checkRoomAvailability(
      show,
      uidMaps.studioRooms.get(show.studioRoomUid)!,
      prismaClient,
    );
    if (roomConflicts.length > 0) {
      errors.push({
        type: 'room_conflict',
        message: `Room conflict: ${roomConflicts.join(', ')}`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Check MC availability (double-booking)
    for (const mc of show.mcs || []) {
      const mcConflicts = await this.checkMcAvailability(
        show,
        mc.mcUid,
        uidMaps.mcs.get(mc.mcUid)!,
        prismaClient,
      );
      if (mcConflicts.length > 0) {
        errors.push({
          type: 'mc_double_booking',
          message: `MC ${mc.mcUid} is double-booked: ${mcConflicts.join(', ')}`,
          showIndex,
          showTempId: show.tempId,
        });
      }
    }

    return errors;
  }

  /**
   * Checks for internal conflicts within the schedule (room and MC conflicts).
   */
  private checkInternalConflicts(shows: ShowPlanItem[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check room conflicts within schedule
    for (let i = 0; i < shows.length; i++) {
      for (let j = i + 1; j < shows.length; j++) {
        const show1 = shows[i];
        const show2 = shows[j];

        if (
          show1.studioRoomUid === show2.studioRoomUid &&
          this.isTimeOverlapping(
            show1.startTime,
            show1.endTime,
            show2.startTime,
            show2.endTime,
          )
        ) {
          errors.push({
            type: 'internal_conflict',
            message: `Room conflict: Shows "${show1.name}" and "${show2.name}" overlap in time`,
            showIndex: i,
            showTempId: show1.tempId,
          });
        }
      }
    }

    // Check MC double-booking within schedule
    for (let i = 0; i < shows.length; i++) {
      const show1 = shows[i];
      for (let j = i + 1; j < shows.length; j++) {
        const show2 = shows[j];
        const commonMcUids = (show1.mcs || [])
          .map((mc) => mc.mcUid)
          .filter((mcUid) =>
            (show2.mcs || []).some((mc) => mc.mcUid === mcUid),
          );

        for (const mcUid of commonMcUids) {
          if (
            this.isTimeOverlapping(
              show1.startTime,
              show1.endTime,
              show2.startTime,
              show2.endTime,
            )
          ) {
            errors.push({
              type: 'internal_conflict',
              message: `MC ${mcUid} is assigned to overlapping shows "${show1.name}" and "${show2.name}"`,
              showIndex: i,
              showTempId: show1.tempId,
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Checks room availability by querying existing shows.
   */
  private async checkRoomAvailability(
    show: ShowPlanItem,
    roomId: bigint,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<string[]> {
    const startTime = new Date(show.startTime);
    const endTime = new Date(show.endTime);

    const conflictingShows = await prismaClient.show.findMany({
      where: {
        studioRoomId: roomId,
        deletedAt: null,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
        // Exclude existing show if we're updating it
        ...(show.existingShowUid
          ? {
              uid: { not: show.existingShowUid },
            }
          : {}),
      },
      select: { uid: true, name: true, startTime: true, endTime: true },
    });

    return conflictingShows.map(
      (s) =>
        `Show ${s.name} (${s.uid}) at ${s.startTime.toISOString()}-${s.endTime.toISOString()}`,
    );
  }

  /**
   * Checks MC availability by querying existing show-MC assignments.
   */
  private async checkMcAvailability(
    show: ShowPlanItem,
    mcUid: string,
    mcId: bigint,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<string[]> {
    const startTime = new Date(show.startTime);
    const endTime = new Date(show.endTime);

    // Find all shows where this MC is assigned and time overlaps
    const conflictingShows = await prismaClient.show.findMany({
      where: {
        showMCs: {
          some: {
            mcId: mcId,
            deletedAt: null,
          },
        },
        deletedAt: null,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
        // Exclude existing show if we're updating it
        ...(show.existingShowUid
          ? {
              uid: { not: show.existingShowUid },
            }
          : {}),
      },
      select: { uid: true, name: true, startTime: true, endTime: true },
    });

    return conflictingShows.map(
      (s) =>
        `Show ${s.name} (${s.uid}) at ${s.startTime.toISOString()}-${s.endTime.toISOString()}`,
    );
  }

  /**
   * Builds UID lookup maps for all references in the schedule.
   */
  private async buildUidLookupMaps(
    shows: ShowPlanItem[],
    prismaClient: Prisma.TransactionClient | PrismaService,
  ) {
    // Collect all unique UIDs
    const clientUids = new Set<string>();
    const studioRoomUids = new Set<string>();
    const showTypeUids = new Set<string>();
    const showStatusUids = new Set<string>();
    const showStandardUids = new Set<string>();
    const mcUids = new Set<string>();
    const platformUids = new Set<string>();

    shows.forEach((show) => {
      clientUids.add(show.clientUid);
      studioRoomUids.add(show.studioRoomUid);
      showTypeUids.add(show.showTypeUid);
      showStatusUids.add(show.showStatusUid);
      showStandardUids.add(show.showStandardUid);
      (show.mcs || []).forEach((mc) => mcUids.add(mc.mcUid));
      (show.platforms || []).forEach((platform) =>
        platformUids.add(platform.platformUid),
      );
    });

    // Fetch all entities
    const [
      clients,
      studioRooms,
      showTypes,
      showStatuses,
      showStandards,
      mcs,
      platforms,
    ] = await Promise.all([
      prismaClient.client.findMany({
        where: { uid: { in: Array.from(clientUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      prismaClient.studioRoom.findMany({
        where: { uid: { in: Array.from(studioRoomUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      prismaClient.showType.findMany({
        where: { uid: { in: Array.from(showTypeUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      prismaClient.showStatus.findMany({
        where: { uid: { in: Array.from(showStatusUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      prismaClient.showStandard.findMany({
        where: { uid: { in: Array.from(showStandardUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      prismaClient.mC.findMany({
        where: { uid: { in: Array.from(mcUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      prismaClient.platform.findMany({
        where: { uid: { in: Array.from(platformUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
    ]);

    // Build maps
    const clientMap = new Map(clients.map((c) => [c.uid, c.id]));
    const studioRoomMap = new Map(studioRooms.map((r) => [r.uid, r.id]));
    const showTypeMap = new Map(showTypes.map((t) => [t.uid, t.id]));
    const showStatusMap = new Map(showStatuses.map((s) => [s.uid, s.id]));
    const showStandardMap = new Map(showStandards.map((s) => [s.uid, s.id]));
    const mcMap = new Map(mcs.map((m) => [m.uid, m.id]));
    const platformMap = new Map(platforms.map((p) => [p.uid, p.id]));

    return {
      clients: clientMap,
      studioRooms: studioRoomMap,
      showTypes: showTypeMap,
      showStatuses: showStatusMap,
      showStandards: showStandardMap,
      mcs: mcMap,
      platforms: platformMap,
    };
  }

  /**
   * Checks if two time ranges overlap.
   */
  private isTimeOverlapping(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();

    return s1 < e2 && s2 < e1;
  }
}
