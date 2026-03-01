import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import {
  planDocumentSchema,
  ShowPlanItem,
  ValidationError,
  ValidationResult,
} from './schemas/schedule-planning.schema';

import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    public readonly utilityService: UtilityService,
  ) {}

  /**
   * Validates an entire schedule including all shows in the plan document.
   *
   * @param schedule - The schedule to validate
   * @param schedule.id - Schedule ID
   * @param schedule.uid - Schedule unique identifier
   * @param schedule.startDate - Schedule start date
   * @param schedule.endDate - Schedule end date
   * @param schedule.planDocument - Plan document containing shows
   * @param schedule.clientId - Client ID (nullable)
   * @returns Validation result with errors if any
   */
  async validateSchedule(
    schedule: {
      id: bigint;
      uid: string;
      startDate: Date;
      endDate: Date;
      planDocument: unknown;
      clientId: bigint | null;
    },
  ): Promise<ValidationResult> {
    const prismaClient = this.txHost.tx;
    const errors: ValidationError[] = [];

    // Validate plan document structure
    const rawPlanDocument = schedule.planDocument as Record<string, unknown> | null;
    if (!rawPlanDocument || !Array.isArray(rawPlanDocument.shows)) {
      errors.push({
        type: 'reference_not_found',
        message: 'Plan document must contain a shows array',
      });
      return { isValid: false, errors };
    }

    const parseResult = planDocumentSchema.safeParse(schedule.planDocument);
    if (!parseResult.success) {
      parseResult.error.issues.forEach((issue) => {
        const showIndex = typeof issue.path[1] === 'number'
          ? issue.path[1]
          : undefined;
        const fieldPath = issue.path.join('.');
        errors.push({
          type: 'missing_field',
          message: `Invalid plan document at "${fieldPath}": ${issue.message}`,
          showIndex,
        });
      });
      return { isValid: false, errors };
    }

    const parsedPlan = parseResult.data;
    const shows = parsedPlan.shows;
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);

    // Build UID lookup maps for all references
    const uidMaps = await this.buildUidLookupMaps(shows, prismaClient);

    const externalIdErrors = await this.validateExternalIdRules(
      shows,
      schedule.id,
      uidMaps,
      prismaClient,
    );
    errors.push(...externalIdErrors);

    // Validate each show
    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const showErrors = this.validateShow(
        show,
        i,
        scheduleStart,
        scheduleEnd,
        uidMaps,
        prismaClient,
      );
      errors.push(...showErrors);

      // Check Client Consistency
      if (schedule.clientId) {
        const consistencyErrors = this.validateClientConsistency(
          show.clientId,
          schedule.clientId,
          uidMaps,
          i,
        );
        errors.push(...consistencyErrors);
      }

      // If it's an existing show update, check if we're changing immutable fields
      if (show.existingShowId) {
        const _existingShow = uidMaps.existingShows.get(show.existingShowId);
        // Logic to check immutable fields could go here if needed.
        // For now we assume the spreadsheet is the source of truth for mutable fields.
      }
    }

    // Check for internal conflicts (room and MC double-booking within schedule)
    // Phase 1: Only validates conflicts within the schedule itself (per-client).
    // Cross-schedule validation (conflicts with other published schedules) is deferred to Phase 2.
    const conflictErrors = this.checkInternalConflicts(shows);
    errors.push(...conflictErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async validateExternalIdRules(
    shows: ShowPlanItem[],
    scheduleId: bigint,
    uidMaps: Awaited<ReturnType<typeof this.buildUidLookupMaps>>,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const seen = new Set<string>();
    const duplicated = new Set<string>();
    const uniqueExternalIds = new Set<string>();

    shows.forEach((show, index) => {
      if (!show.externalId || !show.externalId.trim()) {
        errors.push({
          type: 'missing_field',
          message: 'external_id is required',
          showIndex: index,
          showTempId: show.tempId,
        });
        return;
      }

      const normalized = show.externalId.trim();
      uniqueExternalIds.add(normalized);

      if (seen.has(normalized)) {
        duplicated.add(normalized);
      } else {
        seen.add(normalized);
      }
    });

    if (duplicated.size > 0) {
      shows.forEach((show, index) => {
        if (show.externalId && duplicated.has(show.externalId.trim())) {
          errors.push({
            type: 'invalid_relationship',
            message: `Duplicate external_id "${show.externalId}" in plan payload`,
            showIndex: index,
            showTempId: show.tempId,
          });
        }
      });
    }

    const clientIds = Array.from(
      new Set(
        shows
          .map((show) => uidMaps.clients.get(show.clientId))
          .filter((id): id is bigint => !!id),
      ),
    );

    if (clientIds.length === 0 || uniqueExternalIds.size === 0) {
      return errors;
    }

    const collisions = await prismaClient.show.findMany({
      where: {
        clientId: { in: clientIds },
        externalId: { in: Array.from(uniqueExternalIds) },
        scheduleId: { not: scheduleId },
        deletedAt: null,
      },
      select: {
        externalId: true,
      },
    });

    const collidedExternalIds = new Set(
      collisions
        .map((row) => row.externalId)
        .filter((externalId): externalId is string => !!externalId),
    );

    if (collidedExternalIds.size === 0) {
      return errors;
    }

    shows.forEach((show, index) => {
      if (show.externalId && collidedExternalIds.has(show.externalId.trim())) {
        errors.push({
          type: 'invalid_relationship',
          message: `external_id "${show.externalId}" already exists on a different schedule for this client`,
          showIndex: index,
          showTempId: show.tempId,
        });
      }
    });

    return errors;
  }

  /**
   * Validates an individual show plan item.
   */
  private validateShow(
    show: ShowPlanItem,
    showIndex: number,
    scheduleStart: Date,
    scheduleEnd: Date,
    uidMaps: Awaited<ReturnType<typeof this.buildUidLookupMaps>>,
    _prismaClient: Prisma.TransactionClient | PrismaService,
  ): ValidationError[] {
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
    // Allow shows to start on the end date but finish overnight (next day)
    // So check startTime against scheduleEnd instead of checking endTime
    if (startTime < scheduleStart || startTime > scheduleEnd) {
      errors.push({
        type: 'time_range',
        message: `Show start time must be within schedule date range (${scheduleStart.toISOString()} to ${scheduleEnd.toISOString()})`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Check for clients
    if (!show.clientId) {
      errors.push({
        type: 'missing_field',
        message: 'Client ID is missing',
        showIndex,
        showTempId: show.tempId,
      });
    } else if (!uidMaps.clients.has(show.clientId)) {
      errors.push({
        type: 'reference_not_found',
        message: `Client with ID ${show.clientId} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Check for studioRoom
    if (show.studioRoomId && !uidMaps.studioRooms.has(show.studioRoomId)) {
      errors.push({
        type: 'reference_not_found',
        message: `Studio Room with ID ${show.studioRoomId} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.showTypes.has(show.showTypeId)) {
      errors.push({
        type: 'reference_not_found',
        message: `Show type with ID ${show.showTypeId} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.showStatuses.has(show.showStatusId)) {
      errors.push({
        type: 'reference_not_found',
        message: `Show status with ID ${show.showStatusId} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    if (!uidMaps.showStandards.has(show.showStandardId)) {
      errors.push({
        type: 'reference_not_found',
        message: `Show standard with ID ${show.showStandardId} not found`,
        showIndex,
        showTempId: show.tempId,
      });
    }

    // Validate MCs
    for (const mc of show.mcs || []) {
      if (mc.mcId && !uidMaps.mcs.has(mc.mcId)) {
        errors.push({
          type: 'reference_not_found',
          message: `MC with ID ${mc.mcId} not found`,
          showIndex,
          showTempId: show.tempId,
        });
      }
    }

    // Validate platforms
    for (const platform of show.platforms || []) {
      if (platform.platformId && !uidMaps.platforms.has(platform.platformId)) {
        errors.push({
          type: 'reference_not_found',
          message: `Platform with ID ${platform.platformId} not found`,
          showIndex,
          showTempId: show.tempId,
        });
      }
    }

    // Note: Room and MC availability checks against existing published shows are disabled
    // for Phase 1 per design doc - we only validate conflicts within the schedule itself.
    // Cross-schedule validation (conflicts with other published schedules) is deferred to Phase 2.
    //
    // Internal conflicts (within schedule) are checked separately in checkInternalConflicts()

    return errors;
  }

  /**
   * Validates that all shows in a schedule belong to the same client.
   * Phase 1 requirement: one schedule per client.
   *
   * @param showClientUid - The client UID from the show item
   * @param scheduleClientId - The client ID of the schedule
   * @param uidMaps - UID lookup maps
   * @param showIndex - Index of the show in the plan
   * @returns Array of validation errors if any shows belong to different clients
   */
  private validateClientConsistency(
    showClientUid: string,
    scheduleClientId: bigint,
    uidMaps: Awaited<ReturnType<typeof this.buildUidLookupMaps>>,
    showIndex: number,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const showClientId = uidMaps.clients.get(showClientUid);

    // If client UID doesn't exist, it will be caught by reference validation earlier.
    // We only check for consistency if we resolved the ID.
    if (showClientId && showClientId !== scheduleClientId) {
      errors.push({
        type: 'invalid_relationship',
        message: `Show belongs to a different client than the schedule. All shows in a schedule must belong to the same client.`,
        showIndex,
      });
    }

    return errors;
  }

  /**
   * Checks for internal conflicts within the schedule (room and MC conflicts).
   * Phase 1: Only validates conflicts within the schedule itself (per-client validation).
   * Cross-schedule validation (conflicts with other published schedules) is deferred to Phase 2.
   */
  private checkInternalConflicts(shows: ShowPlanItem[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check room conflicts within schedule
    for (let i = 0; i < shows.length; i++) {
      for (let j = i + 1; j < shows.length; j++) {
        const show1 = shows[i];
        const show2 = shows[j];

        if (
          show1.studioRoomId
          && show2.studioRoomId
          && show1.studioRoomId === show2.studioRoomId
          && this.utilityService.isTimeOverlapping(
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
          .map((mc) => mc.mcId)
          .filter((mcId) =>
            (show2.mcs || []).some((mc) => mc.mcId === mcId),
          );

        for (const mcUid of commonMcUids) {
          if (
            this.utilityService.isTimeOverlapping(
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
   * Excludes shows from the current schedule being validated (only checks conflicts with other schedules).
   *
   * @deprecated Phase 1: Cross-schedule validation is deferred to Phase 2.
   * This method is kept for future Phase 2 implementation but is not currently used.
   */
  private async checkRoomAvailability(
    show: ShowPlanItem,
    roomId: bigint,
    scheduleId: bigint,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<string[]> {
    const startTime = new Date(show.startTime);
    const endTime = new Date(show.endTime);

    const conflictingShows = await prismaClient.show.findMany({
      where: {
        studioRoomId: roomId,
        deletedAt: null,
        // Exclude shows from the current schedule being validated
        scheduleId: { not: scheduleId },
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
        ...(show.existingShowId
          ? {
              uid: { not: show.existingShowId },
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
   * Excludes shows from the current schedule being validated (only checks conflicts with other schedules).
   *
   * @deprecated Phase 1: Cross-schedule validation is deferred to Phase 2.
   * This method is kept for future Phase 2 implementation but is not currently used.
   */
  private async checkMcAvailability(
    show: ShowPlanItem,
    mcUid: string,
    mcId: bigint,
    scheduleId: bigint,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<string[]> {
    const startTime = new Date(show.startTime);
    const endTime = new Date(show.endTime);

    // Find all shows where this MC is assigned and time overlaps
    const conflictingShows = await prismaClient.show.findMany({
      where: {
        showMCs: {
          some: {
            mcId,
            deletedAt: null,
          },
        },
        deletedAt: null,
        // Exclude shows from the current schedule being validated
        scheduleId: { not: scheduleId },
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
        ...(show.existingShowId
          ? {
              uid: { not: show.existingShowId },
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
  ): Promise<{
      clients: Map<string, bigint>;
      studioRooms: Map<string, bigint>;
      showTypes: Map<string, bigint>;
      showStatuses: Map<string, bigint>;
      showStandards: Map<string, bigint>;
      mcs: Map<string, bigint>;
      platforms: Map<string, bigint>;
      existingShows: Map<string, bigint>;
    }> {
    // Collect all unique UIDs
    const clientUids = new Set<string>();
    const studioRoomUids = new Set<string>();
    const showTypeUids = new Set<string>();
    const showStatusUids = new Set<string>();
    const showStandardUids = new Set<string>();
    const mcUids = new Set<string>();
    const platformUids = new Set<string>();
    const existingShowIds = new Set<string>();

    shows.forEach((show) => {
      show.clientId && clientUids.add(show.clientId);
      show.studioRoomId && studioRoomUids.add(show.studioRoomId);
      show.showTypeId && showTypeUids.add(show.showTypeId);
      show.showStatusId && showStatusUids.add(show.showStatusId);
      show.showStandardId && showStandardUids.add(show.showStandardId);
      (show.mcs || []).forEach((mc) => mc.mcId && mcUids.add(mc.mcId));
      (show.platforms || []).forEach((platform) =>
        platform.platformId && platformUids.add(platform.platformId),
      );
      show.existingShowId && existingShowIds.add(show.existingShowId);
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
      existingShows,
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
      prismaClient.show.findMany({
        where: { uid: { in: Array.from(existingShowIds) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
    ]);

    // Build maps with explicit types
    const clientMap = new Map<string, bigint>(
      clients.map((c) => [c.uid, c.id]),
    );
    const studioRoomMap = new Map<string, bigint>(
      studioRooms.map((r) => [r.uid, r.id]),
    );
    const showTypeMap = new Map<string, bigint>(
      showTypes.map((t) => [t.uid, t.id]),
    );
    const showStatusMap = new Map<string, bigint>(
      showStatuses.map((s) => [s.uid, s.id]),
    );
    const showStandardMap = new Map<string, bigint>(
      showStandards.map((s) => [s.uid, s.id]),
    );
    const mcMap = new Map<string, bigint>(mcs.map((m) => [m.uid, m.id]));
    const platformMap = new Map<string, bigint>(
      platforms.map((p) => [p.uid, p.id]),
    );
    const existingShowMap = new Map<string, bigint>(
      existingShows.map((s) => [s.uid, s.id]),
    );

    return {
      clients: clientMap,
      studioRooms: studioRoomMap,
      showTypes: showTypeMap,
      showStatuses: showStatusMap,
      showStandards: showStandardMap,
      mcs: mcMap,
      platforms: platformMap,
      existingShows: existingShowMap,
    };
  }
}
