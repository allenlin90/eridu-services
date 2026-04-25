import { Injectable, Logger } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import {
  PlanDocument,
  planDocumentSchema,
  PublishScheduleSummary,
} from './schemas/schedule-planning.schema';
import type {
  DiffIncomingShow,
  ExistingShow,
  ScheduleWithRelations,
} from './publishing.types';
import { PublishingRelationSyncService } from './publishing-relation-sync.service';
import { buildPublishingUidLookupMaps } from './publishing-uid-lookup';
import { ValidationService } from './validation.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ShowService } from '@/models/show/show.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { UtilityService } from '@/utility/utility.service';

export type { ScheduleWithRelations } from './publishing.types';

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly relationSyncService: PublishingRelationSyncService,
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

    const uidMaps = await buildPublishingUidLookupMaps(planDocument.shows, schedule, tx);
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
    const incomingByKey = new Map(incomingShows.map((show) => [show.key, show]));

    const currentScheduleShows = await tx.show.findMany({
      where: {
        scheduleId: schedule.id,
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        externalId: true,
        clientId: true,
        scheduleId: true,
        studioId: true,
        studioRoomId: true,
        showTypeId: true,
        showStatusId: true,
        showStandardId: true,
        name: true,
        startTime: true,
        endTime: true,
        metadata: true,
        deletedAt: true,
        showStatus: {
          select: {
            systemKey: true,
          },
        },
      },
    });

    const matchingShows = incomingShows.length === 0
      ? []
      : await tx.show.findMany({
        where: {
          clientId: {
            in: Array.from(new Set(incomingShows.map((show) => show.clientId))),
          },
          externalId: {
            in: incomingShows.map((show) => show.source.externalId),
          },
        },
        select: {
          id: true,
          uid: true,
          externalId: true,
          clientId: true,
          scheduleId: true,
          studioId: true,
          studioRoomId: true,
          showTypeId: true,
          showStatusId: true,
          showStandardId: true,
          name: true,
          startTime: true,
          endTime: true,
          metadata: true,
          deletedAt: true,
          showStatus: {
            select: {
              systemKey: true,
            },
          },
        },
      });

    const conflictingAdoption = matchingShows.find((show) => {
      if (!show.externalId) {
        return false;
      }
      const incoming = incomingByKey.get(`${show.clientId.toString()}:${show.externalId}`);
      return (
        !!incoming
        && show.studioId !== null
        && incoming.studioId !== null
        && show.studioId !== incoming.studioId
      );
    });

    if (conflictingAdoption) {
      throw HttpError.conflict('SHOW_RESTORE_CONFLICT');
    }

    const existingByKey = new Map<string, ExistingShow>();
    const currentScheduleByKey = new Map<string, ExistingShow>();

    matchingShows.forEach((show) => {
      if (!show.externalId) {
        return;
      }
      const key = `${show.clientId.toString()}:${show.externalId}`;
      existingByKey.set(key, show);
    });

    currentScheduleShows.forEach((show) => {
      if (!show.externalId) {
        return;
      }
      const key = `${show.clientId.toString()}:${show.externalId}`;
      currentScheduleByKey.set(key, show);
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

    currentScheduleByKey.forEach((existing, key) => {
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
      creator_links_added: 0,
      creator_links_updated: 0,
      creator_links_removed: 0,
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

      if (existing.scheduleId !== schedule.id) {
        updateData.scheduleId = schedule.id;
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

      const wasDeleted = existing.deletedAt !== null;
      const wasCancelled = existing.showStatus.systemKey === 'CANCELLED'
        || existing.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION';

      if (wasDeleted) {
        updateData.deletedAt = null;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.show.update({
          where: { id: existing.id },
          data: updateData,
        });
        publishSummary.shows_updated += 1;
      }

      if (wasDeleted || wasCancelled) {
        publishSummary.shows_restored += 1;
      }

      // wasCancelled: show was soft-cancelled via status — tasks are soft-deleted and can be resumed.
      // wasDeleted: show was manually deleted (pre-start) via studio CRUD — deleteShow hard-purges
      // tasks, so there is nothing to resume; the incoming payload starts a new lifecycle.
      if (wasCancelled) {
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

    await this.relationSyncService.syncShowRelations(
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
}
