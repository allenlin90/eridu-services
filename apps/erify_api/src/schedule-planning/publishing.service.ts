import { Injectable } from '@nestjs/common';
import { Schedule } from '@prisma/client';

import { HttpError } from '@/common/errors/http-error.util';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ShowService } from '@/models/show/show.service';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { PrismaService, TransactionClient } from '@/prisma/prisma.service';

import { PlanDocument, ShowPlanItem } from './schemas/schedule-planning.schema';
import { ValidationService } from './validation.service';

// Type for Schedule with relations from publish
export type ScheduleWithRelations = Schedule & {
  client: { uid: string; name: string } | null;
  createdByUser: { uid: string; name: string; email: string } | null;
  publishedByUser: { uid: string; name: string; email: string } | null;
};

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly validationService: ValidationService,
  ) {}

  /**
   * Publishes a schedule by syncing the JSON plan document to normalized Show tables.
   * This performs a delete + insert strategy for clean replacement.
   *
   * @param scheduleUid - The schedule UID to publish
   * @param version - The version number for optimistic locking
   * @param userId - The user ID publishing the schedule
   * @returns The published schedule
   */
  async publish(
    scheduleUid: string,
    version: number,
    userId: bigint,
  ): Promise<{
    schedule: ScheduleWithRelations;
    showsCreated: number;
    showsDeleted: number;
  }> {
    // Get schedule with plan document
    const schedule = await this.scheduleService.getScheduleById(scheduleUid, {
      client: true,
      createdByUser: true,
    });

    // Validate status
    if (schedule.status === 'published') {
      throw HttpError.badRequest('Schedule is already published');
    }

    // Validate optimistic locking
    if (schedule.version !== version) {
      throw HttpError.conflict(
        `Version mismatch. Expected ${version}, but schedule is at version ${schedule.version}`,
      );
    }

    // Validate plan document structure
    const planDocument = schedule.planDocument as PlanDocument;
    if (
      !planDocument ||
      !planDocument.shows ||
      !Array.isArray(planDocument.shows)
    ) {
      throw HttpError.badRequest('Invalid plan document structure');
    }

    // Validate schedule before publishing
    const validationResult = await this.validationService.validateSchedule({
      id: schedule.id,
      uid: schedule.uid,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      planDocument,
      clientId: schedule.clientId,
    });

    if (!validationResult.isValid) {
      throw HttpError.badRequestWithDetails('Schedule validation failed', {
        errors: validationResult.errors,
      });
    }

    // Execute publish workflow in a transaction
    // Use longer timeout for complex publish operations that may involve many shows
    return this.prisma.executeTransaction(
      async (tx) => {
        // Note: We don't create a before_publish snapshot because:
        // 1. The schedule's planDocument remains unchanged if publish fails
        // 2. We can only publish the latest version (optimistic locking ensures this)
        // 3. If we want to publish an old version, we restore from snapshot first (creates new version)
        // 4. The schedule's planDocument is the source of truth and doesn't change during publish
        // 5. If publish fails, we can simply retry - no rollback needed

        // 1. Delete existing shows associated with this schedule
        // cascade deletes ShowMC and ShowPlatform relationships
        const deletedShows = await tx.show.deleteMany({
          where: {
            scheduleId: schedule.id,
            deletedAt: null,
          },
        });

        // 2. Build UID lookup maps for all references
        const uidMaps = await this.buildUidLookupMaps(planDocument.shows, tx);

        // 3. Generate UIDs and prepare show data (without relationships)
        const showUids = planDocument.shows.map(() =>
          this.showService.generateShowUid(),
        );
        const showsToCreate = planDocument.shows.map((showItem, index) => ({
          uid: showUids[index],
          name: showItem.name,
          startTime: new Date(showItem.startTime),
          endTime: new Date(showItem.endTime),
          metadata: showItem.metadata || {},
          clientId: uidMaps.clients.get(showItem.clientUid)!,
          studioRoomId: uidMaps.studioRooms.get(showItem.studioRoomUid)!,
          showTypeId: uidMaps.showTypes.get(showItem.showTypeUid)!,
          showStatusId: uidMaps.showStatuses.get(showItem.showStatusUid)!,
          showStandardId: uidMaps.showStandards.get(showItem.showStandardUid)!,
          scheduleId: schedule.id,
        }));

        // 4. Bulk create all shows at once (no relationships)
        await tx.show.createMany({
          data: showsToCreate,
        });

        // 5. Query back created shows to get their IDs (needed for relationships)
        const createdShows = await tx.show.findMany({
          where: {
            uid: { in: showUids },
            scheduleId: schedule.id,
          },
          select: { id: true, uid: true },
        });

        // 6. Build a map of show UID -> show ID for relationship creation
        const showIdMap = new Map(
          createdShows.map((show) => [show.uid, show.id]),
        );

        // 7. Prepare ShowMC data for bulk insert
        const showMCsToCreate = planDocument.shows.flatMap(
          (showItem, index) => {
            const showId = showIdMap.get(showUids[index])!;
            return (showItem.mcs || []).map((mc) => ({
              uid: this.showMcService.generateShowMcUid(),
              showId,
              mcId: uidMaps.mcs.get(mc.mcUid)!,
              note: mc.note,
              metadata: {},
            }));
          },
        );

        // 8. Bulk create all ShowMCs at once
        if (showMCsToCreate.length > 0) {
          await tx.showMC.createMany({
            data: showMCsToCreate,
          });
        }

        // 9. Prepare ShowPlatform data for bulk insert
        const showPlatformsToCreate = planDocument.shows.flatMap(
          (showItem, index) => {
            const showId = showIdMap.get(showUids[index])!;
            return (showItem.platforms || []).map((platform) => ({
              uid: this.showPlatformService.generateShowPlatformUid(),
              showId,
              platformId: uidMaps.platforms.get(platform.platformUid)!,
              liveStreamLink: platform.liveStreamLink,
              platformShowId: platform.platformShowId,
              viewerCount: 0,
              metadata: {},
            }));
          },
        );

        // 10. Bulk create all ShowPlatforms at once
        if (showPlatformsToCreate.length > 0) {
          await tx.showPlatform.createMany({
            data: showPlatformsToCreate,
          });
        }

        // 11. Mark schedule as published
        const updatedSchedule = await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            publishedBy: userId,
            version: schedule.version + 1,
          },
          include: {
            client: true,
            createdByUser: true,
            publishedByUser: true,
          },
        });

        return {
          schedule: updatedSchedule,
          showsCreated: createdShows.length,
          showsDeleted: deletedShows.count,
        };
      },
      {
        timeout: 30000, // 30 seconds for complex publish operations
      },
    );
  }

  /**
   * Builds UID lookup maps for all references needed for publishing.
   */
  private async buildUidLookupMaps(
    shows: ShowPlanItem[],
    tx: TransactionClient,
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
      tx.client.findMany({
        where: { uid: { in: Array.from(clientUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      tx.studioRoom.findMany({
        where: { uid: { in: Array.from(studioRoomUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      tx.showType.findMany({
        where: { uid: { in: Array.from(showTypeUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      tx.showStatus.findMany({
        where: { uid: { in: Array.from(showStatusUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      tx.showStandard.findMany({
        where: { uid: { in: Array.from(showStandardUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      tx.mC.findMany({
        where: { uid: { in: Array.from(mcUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
      tx.platform.findMany({
        where: { uid: { in: Array.from(platformUids) }, deletedAt: null },
        select: { id: true, uid: true },
      }),
    ]);

    // Build maps
    return {
      clients: new Map(clients.map((c) => [c.uid, c.id])),
      studioRooms: new Map(studioRooms.map((r) => [r.uid, r.id])),
      showTypes: new Map(showTypes.map((t) => [t.uid, t.id])),
      showStatuses: new Map(showStatuses.map((s) => [s.uid, s.id])),
      showStandards: new Map(showStandards.map((s) => [s.uid, s.id])),
      mcs: new Map(mcs.map((m) => [m.uid, m.id])),
      platforms: new Map(platforms.map((p) => [p.uid, p.id])),
    };
  }
}
