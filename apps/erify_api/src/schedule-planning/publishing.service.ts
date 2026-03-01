import { Injectable, Logger } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Schedule } from '@prisma/client';

import {
  PlanDocument,
  planDocumentSchema,
  PublishScheduleSummary,
  ShowPlanItem,
} from './schemas/schedule-planning.schema';
import { ValidationService } from './validation.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ShowService } from '@/models/show/show.service';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { UtilityService } from '@/utility/utility.service';

export type ScheduleWithRelations = Schedule & {
  client: { uid: string; name: string } | null;
  studio: { uid: string; name: string } | null;
  createdByUser: { uid: string; name: string; email: string } | null;
  publishedByUser: { uid: string; name: string; email: string } | null;
};

type DiffIncomingShow = {
  source: ShowPlanItem;
  key: string;
  clientId: bigint;
  studioId: bigint | null;
  studioRoomId: bigint | null;
  showTypeId: bigint;
  showStatusId: bigint;
  showStandardId: bigint;
};

type ExistingShow = {
  id: bigint;
  uid: string;
  externalId: string | null;
  clientId: bigint;
  studioId: bigint | null;
  studioRoomId: bigint | null;
  showTypeId: bigint;
  showStatusId: bigint;
  showStandardId: bigint;
  name: string;
  startTime: Date;
  endTime: Date;
  metadata: unknown;
  showStatus: {
    systemKey: string | null;
  };
};

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly validationService: ValidationService,
    private readonly utilityService: UtilityService,
  ) {}

  @Transactional<TransactionalAdapterPrisma>({ timeout: 30_000 })
  async publish(
    scheduleUid: string,
    version: number,
    userId: bigint,
  ): Promise<{
      schedule: ScheduleWithRelations;
      publishSummary: PublishScheduleSummary;
    }> {
    const schedule = await this.scheduleService.getScheduleById(scheduleUid, {
      client: true,
      studio: true,
      createdByUser: true,
    });

    if (schedule.status === 'published') {
      throw HttpError.badRequest('Schedule is already published');
    }

    if (schedule.version !== version) {
      throw HttpError.conflict(
        `Version mismatch. Expected ${version}, but schedule is at version ${schedule.version}`,
      );
    }

    const parseResult = planDocumentSchema.safeParse(schedule.planDocument);
    if (!parseResult.success) {
      throw HttpError.badRequestWithDetails('Invalid plan document structure', {
        issues: parseResult.error.issues,
      });
    }

    const planDocument = parseResult.data;

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

    return this.publishDiffUpsert(schedule as ScheduleWithRelations, planDocument, userId);
  }

  private async publishDiffUpsert(
    schedule: ScheduleWithRelations,
    planDocument: PlanDocument,
    userId: bigint,
  ): Promise<{
      schedule: ScheduleWithRelations;
      publishSummary: PublishScheduleSummary;
    }> {
    const tx = this.txHost.tx;

    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${schedule.id})`;
    }

    const uidMaps = await this.buildUidLookupMaps(planDocument.shows, schedule);
    const statusIds = await this.resolveRequiredStatusIds();

    const incomingShows = planDocument.shows.map((show): DiffIncomingShow => {
      const clientId = uidMaps.clients.get(show.clientId);
      if (!clientId) {
        throw HttpError.badRequest(`Client not found for show: ${show.clientId}`);
      }

      const showTypeId = uidMaps.showTypes.get(show.showTypeId);
      const showStatusId = uidMaps.showStatuses.get(show.showStatusId);
      const showStandardId = uidMaps.showStandards.get(show.showStandardId);

      if (!showTypeId || !showStatusId || !showStandardId) {
        throw HttpError.badRequest(`Invalid show references for external_id: ${show.externalId}`);
      }

      const studioId = show.studioId
        ? uidMaps.studios.get(show.studioId) || null
        : schedule.studioId || null;

      const studioRoomId = show.studioRoomId
        ? uidMaps.studioRooms.get(show.studioRoomId) || null
        : null;

      return {
        source: show,
        key: `${clientId.toString()}:${show.externalId}`,
        clientId,
        studioId,
        studioRoomId,
        showTypeId,
        showStatusId,
        showStandardId,
      };
    });

    const existingShows = await tx.show.findMany({
      where: {
        scheduleId: schedule.id,
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        externalId: true,
        clientId: true,
        studioId: true,
        studioRoomId: true,
        showTypeId: true,
        showStatusId: true,
        showStandardId: true,
        name: true,
        startTime: true,
        endTime: true,
        metadata: true,
        showStatus: {
          select: {
            systemKey: true,
          },
        },
      },
    });

    const incomingByKey = new Map(incomingShows.map((show) => [show.key, show]));
    const existingByKey = new Map<string, ExistingShow>();

    existingShows.forEach((show) => {
      if (!show.externalId) {
        return;
      }
      const key = `${show.clientId.toString()}:${show.externalId}`;
      existingByKey.set(key, show);
    });

    const toCreate: DiffIncomingShow[] = [];
    const toUpdate: Array<{ incoming: DiffIncomingShow; existing: ExistingShow }> = [];
    const toRemove: ExistingShow[] = [];

    incomingByKey.forEach((incoming, key) => {
      const existing = existingByKey.get(key);
      if (existing) {
        toUpdate.push({ incoming, existing });
      } else {
        toCreate.push(incoming);
      }
    });

    existingByKey.forEach((existing, key) => {
      if (!incomingByKey.has(key)) {
        toRemove.push(existing);
      }
    });

    const publishSummary: PublishScheduleSummary = {
      shows_created: 0,
      shows_updated: 0,
      shows_cancelled: 0,
      shows_pending_resolution: 0,
      shows_restored: 0,
      mc_links_added: 0,
      mc_links_updated: 0,
      mc_links_removed: 0,
      platform_links_added: 0,
      platform_links_updated: 0,
      platform_links_removed: 0,
    };

    const incomingByShowId = new Map<bigint, DiffIncomingShow>();

    if (toCreate.length > 0) {
      const createData = toCreate.map((show) => ({
        uid: this.showService.generateShowUid(),
        externalId: show.source.externalId,
        name: show.source.name,
        startTime: new Date(show.source.startTime),
        endTime: new Date(show.source.endTime),
        metadata: show.source.metadata || {},
        clientId: show.clientId,
        studioId: show.studioId,
        studioRoomId: show.studioRoomId,
        showTypeId: show.showTypeId,
        showStatusId: show.showStatusId,
        showStandardId: show.showStandardId,
        scheduleId: schedule.id,
      }));

      await tx.show.createMany({ data: createData });

      const createdShows = await tx.show.findMany({
        where: {
          scheduleId: schedule.id,
          clientId: { in: Array.from(new Set(toCreate.map((s) => s.clientId))) },
          externalId: { in: toCreate.map((s) => s.source.externalId) },
          deletedAt: null,
        },
        select: {
          id: true,
          clientId: true,
          externalId: true,
        },
      });

      createdShows.forEach((created) => {
        if (!created.externalId) {
          return;
        }
        const key = `${created.clientId.toString()}:${created.externalId}`;
        const incoming = incomingByKey.get(key);
        if (incoming) {
          incomingByShowId.set(created.id, incoming);
        }
      });

      publishSummary.shows_created += createdShows.length;
    }

    for (const pair of toUpdate) {
      const { incoming, existing } = pair;
      incomingByShowId.set(existing.id, incoming);

      const updateData: Record<string, unknown> = {};

      if (existing.name !== incoming.source.name) {
        updateData.name = incoming.source.name;
      }

      const incomingStart = new Date(incoming.source.startTime);
      if (existing.startTime.getTime() !== incomingStart.getTime()) {
        updateData.startTime = incomingStart;
      }

      const incomingEnd = new Date(incoming.source.endTime);
      if (existing.endTime.getTime() !== incomingEnd.getTime()) {
        updateData.endTime = incomingEnd;
      }

      if (existing.clientId !== incoming.clientId) {
        updateData.clientId = incoming.clientId;
      }

      if (existing.studioId !== incoming.studioId) {
        updateData.studioId = incoming.studioId;
      }

      if (existing.studioRoomId !== incoming.studioRoomId) {
        updateData.studioRoomId = incoming.studioRoomId;
      }

      if (existing.showTypeId !== incoming.showTypeId) {
        updateData.showTypeId = incoming.showTypeId;
      }

      if (existing.showStatusId !== incoming.showStatusId) {
        updateData.showStatusId = incoming.showStatusId;
      }

      if (existing.showStandardId !== incoming.showStandardId) {
        updateData.showStandardId = incoming.showStandardId;
      }

      const incomingMetadata = incoming.source.metadata || {};
      if (JSON.stringify(existing.metadata || {}) !== JSON.stringify(incomingMetadata)) {
        updateData.metadata = incomingMetadata;
      }

      const wasCancelled = existing.showStatus.systemKey === 'CANCELLED'
        || existing.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION';

      if (Object.keys(updateData).length > 0) {
        await tx.show.update({
          where: { id: existing.id },
          data: updateData,
        });
        publishSummary.shows_updated += 1;
      }

      if (wasCancelled) {
        publishSummary.shows_restored += 1;
        await this.resumeSoftDeletedTasksAndTargets(existing.id);
      }
    }

    for (const removed of toRemove) {
      const hasActiveTaskTarget = await tx.taskTarget.findFirst({
        where: {
          showId: removed.id,
          deletedAt: null,
          task: {
            deletedAt: null,
          },
        },
        select: {
          id: true,
        },
      });

      const targetStatusId = hasActiveTaskTarget
        ? statusIds.cancelledPendingResolution
        : statusIds.cancelled;

      if (removed.showStatusId !== targetStatusId) {
        await tx.show.update({
          where: { id: removed.id },
          data: {
            showStatusId: targetStatusId,
          },
        });
      }

      if (hasActiveTaskTarget) {
        publishSummary.shows_pending_resolution += 1;
      } else {
        publishSummary.shows_cancelled += 1;
      }
    }

    await this.syncShowRelations(
      incomingByShowId,
      uidMaps,
      publishSummary,
    );

    const updatedSchedule = await tx.schedule.update({
      where: { id: schedule.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
      },
      include: {
        client: true,
        studio: true,
        createdByUser: true,
        publishedByUser: true,
      },
    });

    this.logger.log(
      `Diff publish summary schedule_uid=${schedule.uid} created=${publishSummary.shows_created} updated=${publishSummary.shows_updated} cancelled=${publishSummary.shows_cancelled} pending_resolution=${publishSummary.shows_pending_resolution} restored=${publishSummary.shows_restored}`,
    );

    return {
      schedule: updatedSchedule,
      publishSummary,
    };
  }

  private async resumeSoftDeletedTasksAndTargets(showId: bigint): Promise<void> {
    const tx = this.txHost.tx;

    const showTargets = await tx.taskTarget.findMany({
      where: {
        showId,
      },
      select: {
        taskId: true,
      },
    });

    if (showTargets.length === 0) {
      return;
    }

    const uniqueTaskIds = Array.from(new Set(showTargets.map((target) => target.taskId)));

    await tx.taskTarget.updateMany({
      where: {
        showId,
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
      },
    });

    await tx.task.updateMany({
      where: {
        id: { in: uniqueTaskIds },
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
      },
    });
  }

  private async syncShowRelations(
    incomingByShowId: Map<bigint, DiffIncomingShow>,
    uidMaps: Awaited<ReturnType<PublishingService['buildUidLookupMaps']>>,
    summary: PublishScheduleSummary,
  ): Promise<void> {
    const tx = this.txHost.tx;
    const showIds = Array.from(incomingByShowId.keys());

    if (showIds.length === 0) {
      return;
    }

    const existingShowMcs = await tx.showMC.findMany({
      where: { showId: { in: showIds } },
      select: {
        id: true,
        showId: true,
        mcId: true,
        note: true,
        metadata: true,
        deletedAt: true,
      },
    });

    const existingShowPlatforms = await tx.showPlatform.findMany({
      where: { showId: { in: showIds } },
      select: {
        id: true,
        showId: true,
        platformId: true,
        liveStreamLink: true,
        platformShowId: true,
        metadata: true,
        deletedAt: true,
      },
    });

    const showMcByShowId = new Map<bigint, typeof existingShowMcs>();
    existingShowMcs.forEach((row) => {
      const list = showMcByShowId.get(row.showId) || [];
      list.push(row);
      showMcByShowId.set(row.showId, list);
    });

    const showPlatformByShowId = new Map<bigint, typeof existingShowPlatforms>();
    existingShowPlatforms.forEach((row) => {
      const list = showPlatformByShowId.get(row.showId) || [];
      list.push(row);
      showPlatformByShowId.set(row.showId, list);
    });

    for (const [showId, incoming] of incomingByShowId.entries()) {
      const incomingMcById = new Map<bigint, { note: string | undefined }>();
      (incoming.source.mcs || []).forEach((mc) => {
        const mcId = uidMaps.mcs.get(mc.mcId);
        if (!mcId) {
          return;
        }
        incomingMcById.set(mcId, { note: mc.note });
      });

      const existingMcs = showMcByShowId.get(showId) || [];
      const existingMcByMcId = new Map(existingMcs.map((mc) => [mc.mcId, mc]));

      for (const [mcId, incomingMc] of incomingMcById.entries()) {
        const existing = existingMcByMcId.get(mcId);

        if (!existing) {
          await tx.showMC.create({
            data: {
              uid: this.showMcService.generateShowMcUid(),
              showId,
              mcId,
              note: incomingMc.note,
              metadata: {},
            },
          });
          summary.mc_links_added += 1;
          continue;
        }

        if (existing.deletedAt) {
          await tx.showMC.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              note: incomingMc.note,
              metadata: {},
            },
          });
          summary.mc_links_added += 1;
          continue;
        }

        if ((existing.note || null) !== (incomingMc.note || null)) {
          await tx.showMC.update({
            where: { id: existing.id },
            data: {
              note: incomingMc.note,
            },
          });
          summary.mc_links_updated += 1;
        }
      }

      const staleMcIds = existingMcs
        .filter((mc) => mc.deletedAt === null && !incomingMcById.has(mc.mcId))
        .map((mc) => mc.id);

      if (staleMcIds.length > 0) {
        await tx.showMC.updateMany({
          where: {
            id: { in: staleMcIds },
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });
        summary.mc_links_removed += staleMcIds.length;
      }

      const incomingPlatformById = new Map<bigint, {
        liveStreamLink: string | undefined;
        platformShowId: string | undefined;
      }>();

      (incoming.source.platforms || []).forEach((platform) => {
        const platformId = uidMaps.platforms.get(platform.platformId);
        if (!platformId) {
          return;
        }
        incomingPlatformById.set(platformId, {
          liveStreamLink: platform.liveStreamLink,
          platformShowId: platform.platformShowId,
        });
      });

      const existingPlatforms = showPlatformByShowId.get(showId) || [];
      const existingPlatformById = new Map(existingPlatforms.map((platform) => [platform.platformId, platform]));

      for (const [platformId, incomingPlatform] of incomingPlatformById.entries()) {
        const existing = existingPlatformById.get(platformId);

        if (!existing) {
          await tx.showPlatform.create({
            data: {
              uid: this.showPlatformService.generateShowPlatformUid(),
              showId,
              platformId,
              liveStreamLink: incomingPlatform.liveStreamLink,
              platformShowId: incomingPlatform.platformShowId,
              viewerCount: 0,
              metadata: {},
            },
          });
          summary.platform_links_added += 1;
          continue;
        }

        if (existing.deletedAt) {
          await tx.showPlatform.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              liveStreamLink: incomingPlatform.liveStreamLink,
              platformShowId: incomingPlatform.platformShowId,
              metadata: {},
            },
          });
          summary.platform_links_added += 1;
          continue;
        }

        const hasChanged = (existing.liveStreamLink || null) !== (incomingPlatform.liveStreamLink || null)
          || (existing.platformShowId || null) !== (incomingPlatform.platformShowId || null);

        if (hasChanged) {
          await tx.showPlatform.update({
            where: { id: existing.id },
            data: {
              liveStreamLink: incomingPlatform.liveStreamLink,
              platformShowId: incomingPlatform.platformShowId,
            },
          });
          summary.platform_links_updated += 1;
        }
      }

      const stalePlatformIds = existingPlatforms
        .filter((platform) => platform.deletedAt === null && !incomingPlatformById.has(platform.platformId))
        .map((platform) => platform.id);

      if (stalePlatformIds.length > 0) {
        await tx.showPlatform.updateMany({
          where: {
            id: { in: stalePlatformIds },
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });
        summary.platform_links_removed += stalePlatformIds.length;
      }
    }
  }

  private async resolveRequiredStatusIds(): Promise<{
    cancelled: bigint;
    cancelledPendingResolution: bigint;
  }> {
    const tx = this.txHost.tx;

    const statusConfigs = [
      {
        systemKey: 'CANCELLED',
        fallbackName: 'cancelled',
      },
      {
        systemKey: 'CANCELLED_PENDING_RESOLUTION',
        fallbackName: 'cancelled_pending_resolution',
      },
    ] as const;

    const resolved = await Promise.all(
      statusConfigs.map((status) =>
        tx.showStatus.upsert({
          where: { systemKey: status.systemKey },
          update: {},
          create: {
            uid: this.utilityService.generateBrandedId(ShowStatusService.UID_PREFIX),
            name: status.fallbackName,
            systemKey: status.systemKey,
            metadata: {},
          },
          select: {
            id: true,
            systemKey: true,
          },
        })),
    );

    const byKey = new Map(resolved.map((status) => [status.systemKey, status.id]));

    return {
      cancelled: byKey.get('CANCELLED')!,
      cancelledPendingResolution: byKey.get('CANCELLED_PENDING_RESOLUTION')!,
    };
  }

  /**
   * Builds UID lookup maps for all references needed for publishing.
   */
  private async buildUidLookupMaps(
    shows: ShowPlanItem[],
    schedule: ScheduleWithRelations,
  ) {
    const tx = this.txHost.tx;

    const clientUids = new Set<string>();
    const studioUids = new Set<string>();
    const studioRoomUids = new Set<string>();
    const showTypeUids = new Set<string>();
    const showStatusUids = new Set<string>();
    const showStandardUids = new Set<string>();
    const mcUids = new Set<string>();
    const platformUids = new Set<string>();

    if (schedule.studio?.uid) {
      studioUids.add(schedule.studio.uid);
    }

    shows.forEach((show) => {
      show.clientId && clientUids.add(show.clientId);
      show.studioId && studioUids.add(show.studioId);
      show.studioRoomId && studioRoomUids.add(show.studioRoomId);
      show.showTypeId && showTypeUids.add(show.showTypeId);
      show.showStatusId && showStatusUids.add(show.showStatusId);
      show.showStandardId && showStandardUids.add(show.showStandardId);
      (show.mcs || []).forEach((mc) => mc.mcId && mcUids.add(mc.mcId));
      (show.platforms || []).forEach((platform) =>
        platform.platformId && platformUids.add(platform.platformId),
      );
    });

    const [
      clients,
      studios,
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
      tx.studio.findMany({
        where: { uid: { in: Array.from(studioUids) }, deletedAt: null },
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

    return {
      clients: new Map(clients.map((c) => [c.uid, c.id])),
      studios: new Map(studios.map((s) => [s.uid, s.id])),
      studioRooms: new Map(studioRooms.map((r) => [r.uid, r.id])),
      showTypes: new Map(showTypes.map((t) => [t.uid, t.id])),
      showStatuses: new Map(showStatuses.map((s) => [s.uid, s.id])),
      showStandards: new Map(showStandards.map((s) => [s.uid, s.id])),
      mcs: new Map(mcs.map((m) => [m.uid, m.id])),
      platforms: new Map(platforms.map((p) => [p.uid, p.id])),
    };
  }
}
