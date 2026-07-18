import { Injectable, Logger } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import {
  PlanDocument,
  planDocumentSchema,
  PublishScheduleSummary,
  TERMINAL_PRESERVED_STATUS_KEYS,
} from './schemas/schedule-planning.schema';
import type {
  DiffIncomingShow,
  ExistingShow,
  PublishingUidMaps,
  ScheduleWithRelations,
  ShowRelationSyncChanges,
} from './publishing.types';
import { PublishingRelationSyncService } from './publishing-relation-sync.service';
import { buildPublishingUidLookupMaps } from './publishing-uid-lookup';
import { ValidationService } from './validation.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { OPERATIONAL_DAY_START_HOUR } from '@/lib/utils/operational-day.util';
import { AuditService } from '@/models/audit/audit.service';
import { PublishRunService } from '@/models/publish-run/publish-run.service';
import { PUBLISH_RUN_SOURCE } from '@/models/publish-run/schemas/publish-run.schema';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleConflictService } from '@/models/schedule-conflict/schedule-conflict.service';
import type { HeldBackFieldValue, ScheduleConflictHeldBack } from '@/models/schedule-conflict/schedule-conflict.types';
import { ShowService } from '@/models/show/show.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { UtilityService } from '@/utility/utility.service';

export type { ScheduleWithRelations } from './publishing.types';

const CONFIRMED_STATUS_KEY = 'CONFIRMED';
const SCHEDULE_PUBLISH_IMPACT_EVENT = 'schedule_publish_impact';
const SCHEDULE_INTEGRATION_TIME_ZONE = 'Asia/Bangkok';
const PRESERVED_STATUS_KEYS = new Set([
  'LIVE',
  'COMPLETED',
  'CANCELLED',
  'CANCELLED_PENDING_RESOLUTION',
]);
const UPDATE_PRESERVED_STATUS_KEYS = new Set<string>(TERMINAL_PRESERVED_STATUS_KEYS);

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
    private readonly taskService: TaskService,
    private readonly auditService: AuditService,
    private readonly scheduleConflictService: ScheduleConflictService,
    private readonly taskTargetService: TaskTargetService,
    private readonly publishRunService: PublishRunService,
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

    // Created up front (same transaction) so its id can be stamped onto every
    // schedule_publish_impact audit row written below; the summary counts are
    // written back once the diff+upsert finishes.
    const publishRun = await this.publishRunService.createPublishRun({
      scheduleId: schedule.id,
      studioId: schedule.studioId ?? null,
      triggeredById: userId,
      source: PUBLISH_RUN_SOURCE.GOOGLE_SHEETS_SYNC,
    });

    const uidMaps = await buildPublishingUidLookupMaps(planDocument.shows, schedule, tx);
    const statusIds = await this.resolveRequiredStatusIds();
    const publishStartedAt = new Date();

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
    const incomingStatusKeyById = await this.resolveStatusSystemKeys(
      Array.from(new Set(incomingShows.map((show) => show.showStatusId))),
    );

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
        actualStartTime: true,
        actualEndTime: true,
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
          actualStartTime: true,
          actualEndTime: true,
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
      shows_preserved: 0,
      shows_skipped: 0,
      confirmed_shows_updated: 0,
      confirmed_shows_pending_resolution: 0,
      publish_impacts_recorded: 0,
      creator_mappings_backfilled: 0,
      creator_links_added: 0,
      creator_links_updated: 0,
      creator_links_removed: 0,
      platform_links_added: 0,
      platform_links_updated: 0,
      platform_links_removed: 0,
      tasks_reconciled: 0,
    };

    const incomingByShowId = new Map<bigint, DiffIncomingShow>();
    const confirmedFutureUpdates = new Map<bigint, {
      existing: ExistingShow;
      incoming: DiffIncomingShow;
      changedFields: string[];
    }>();

    const creatableShows = toCreate.filter((show) => {
      const statusKey = incomingStatusKeyById.get(show.showStatusId) ?? null;
      // Never existed, so nothing was "preserved" — track separately from
      // shows_preserved (which counts existing rows left untouched).
      if (this.isIncomingPastOrDone(show, statusKey, publishStartedAt)) {
        publishSummary.shows_skipped += 1;
        return false;
      }
      return true;
    });

    if (creatableShows.length > 0) {
      const createData = creatableShows.map((show) => ({
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
          clientId: { in: Array.from(new Set(creatableShows.map((s) => s.clientId))) },
          externalId: { in: creatableShows.map((s) => s.source.externalId) },
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

    const staleConflictCandidates = new Map<bigint, {
      externalId: string | null;
      heldBackFields: { changedFields: string[]; old: Record<string, HeldBackFieldValue>; new: Record<string, HeldBackFieldValue> } | null;
    }>();
    const terminalShowIds = new Set<bigint>();
    const terminalBackfillCandidates: Array<{ existing: ExistingShow; incoming: DiffIncomingShow }> = [];

    for (const pair of toUpdate) {
      const { incoming, existing } = pair;

      if (this.isTerminalStatus(existing, UPDATE_PRESERVED_STATUS_KEYS)) {
        publishSummary.shows_preserved += 1;
        terminalShowIds.add(existing.id);
        if ((incoming.source.creators?.length ?? 0) > 0) {
          terminalBackfillCandidates.push({ existing, incoming });
        }
        continue;
      }

      incomingByShowId.set(existing.id, incoming);

      const updateData: Record<string, unknown> = {};
      const changedFields: string[] = [];
      const oldFieldValues: Record<string, HeldBackFieldValue> = {};
      const newFieldValues: Record<string, HeldBackFieldValue> = {};

      const trackChange = (field: string, oldValue: HeldBackFieldValue, newValue: HeldBackFieldValue, updateKey: string, updateValue: unknown) => {
        updateData[updateKey] = updateValue;
        changedFields.push(field);
        oldFieldValues[field] = oldValue;
        newFieldValues[field] = newValue;
      };

      if (existing.name !== incoming.source.name) {
        trackChange('name', existing.name, incoming.source.name, 'name', incoming.source.name);
      }

      const incomingStart = new Date(incoming.source.startTime);
      if (existing.startTime.getTime() !== incomingStart.getTime()) {
        trackChange('start_time', existing.startTime.toISOString(), incomingStart.toISOString(), 'startTime', incomingStart);
      }

      const incomingEnd = new Date(incoming.source.endTime);
      if (existing.endTime.getTime() !== incomingEnd.getTime()) {
        trackChange('end_time', existing.endTime.toISOString(), incomingEnd.toISOString(), 'endTime', incomingEnd);
      }

      if (existing.clientId !== incoming.clientId) {
        trackChange('client_id', existing.clientId, incoming.clientId, 'clientId', incoming.clientId);
      }

      // Internal bookkeeping, not a planner-facing field diff: there is no
      // uid to resolve the old/new scheduleId against for display (it isn't
      // one of the six FK fields in FK_FIELD_MODEL_MAP, and raw bigint DB
      // ids must never be exposed via the API), so this intentionally does
      // not go through trackChange / changedFields / held_back.
      if (existing.scheduleId !== schedule.id) {
        updateData.scheduleId = schedule.id;
      }

      if (existing.studioId !== incoming.studioId) {
        trackChange('studio_id', existing.studioId, incoming.studioId, 'studioId', incoming.studioId);
      }

      if (existing.studioRoomId !== incoming.studioRoomId) {
        trackChange('studio_room_id', existing.studioRoomId, incoming.studioRoomId, 'studioRoomId', incoming.studioRoomId);
      }

      if (existing.showTypeId !== incoming.showTypeId) {
        trackChange('show_type_id', existing.showTypeId, incoming.showTypeId, 'showTypeId', incoming.showTypeId);
      }

      if (existing.showStatusId !== incoming.showStatusId) {
        trackChange('show_status_id', existing.showStatusId, incoming.showStatusId, 'showStatusId', incoming.showStatusId);
      }

      if (existing.showStandardId !== incoming.showStandardId) {
        trackChange('show_standard_id', existing.showStandardId, incoming.showStandardId, 'showStandardId', incoming.showStandardId);
      }

      const incomingMetadata = incoming.source.metadata || {};
      if (JSON.stringify(existing.metadata || {}) !== JSON.stringify(incomingMetadata)) {
        updateData.metadata = incomingMetadata;
        changedFields.push('metadata');
        oldFieldValues.metadata = JSON.stringify(existing.metadata || {});
        newFieldValues.metadata = JSON.stringify(incomingMetadata);
      }

      const wasDeleted = existing.deletedAt !== null;
      const wasCancelled = existing.showStatus.systemKey === 'CANCELLED'
        || existing.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION';

      // Internal lifecycle bookkeeping (restore-on-republish), not a
      // planner-facing field diff — intentionally not tracked into
      // changed_fields / held_back either.
      if (wasDeleted) {
        updateData.deletedAt = null;
      }

      const timeChanged = updateData.startTime !== undefined || updateData.endTime !== undefined;

      const heldBackFields = changedFields.length > 0
        ? { changedFields: [...changedFields], old: oldFieldValues, new: newFieldValues }
        : null;

      if (this.hasRecordedActuals(existing)) {
        // Always register as a candidate — even with no field diff — so the
        // reconciliation pass below can auto-resolve a previously-opened
        // conflict once the sheet no longer disagrees with the show. Only
        // skip the write (continue) when there's something to actually hold
        // back.
        staleConflictCandidates.set(existing.id, {
          externalId: incoming.source.externalId,
          heldBackFields,
        });
        if (changedFields.length > 0) {
          // Hold back — do not write. Recorded via staleConflictCandidates
          // below, once every show in toUpdate has been visited.
          continue;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await tx.show.update({
          where: { id: existing.id },
          data: updateData,
        });
        publishSummary.shows_updated += 1;
      }

      if (this.isConfirmedFuture(existing, publishStartedAt)) {
        confirmedFutureUpdates.set(existing.id, { existing, incoming, changedFields });
      }

      if (wasDeleted || wasCancelled) {
        publishSummary.shows_restored += 1;
      }

      // wasCancelled: show was soft-cancelled via status — tasks are soft-deleted and can be resumed.
      // wasDeleted: show was manually deleted (pre-start) via studio CRUD — deleteShow hard-purges
      // tasks, so there is nothing to resume; the incoming payload starts a new lifecycle.
      // This must run before reconciliation below: reconcileTaskDueDates only considers
      // tasks/targets with deletedAt: null, so a still-cancelled task would be invisible to it.
      if (wasCancelled) {
        await this.resumeSoftDeletedTasksAndTargets(existing.id);
      }

      if (timeChanged) {
        const count = await this.taskService.reconcileTaskDueDates(
          existing.id,
          { startTime: existing.startTime, endTime: existing.endTime },
          { startTime: incomingStart, endTime: incomingEnd },
        );
        publishSummary.tasks_reconciled = (publishSummary.tasks_reconciled || 0) + count;
      }
    }

    for (const removed of toRemove) {
      if (this.isTerminalStatus(removed, PRESERVED_STATUS_KEYS)) {
        publishSummary.shows_preserved += 1;
        await this.scheduleConflictService.reconcileShowConflict({
          showId: removed.id,
          scheduleUid: schedule.uid,
          externalId: removed.externalId,
          actorId: userId,
          conflictType: 'removal_held_back',
          heldBack: null,
          publishRunId: publishRun.id,
        });
        continue;
      }

      if (this.isConfirmedFuture(removed, publishStartedAt)) {
        if (removed.showStatusId !== statusIds.cancelledPendingResolution) {
          await tx.show.update({
            where: { id: removed.id },
            data: { showStatusId: statusIds.cancelledPendingResolution },
          });
        }

        publishSummary.shows_pending_resolution += 1;
        publishSummary.confirmed_shows_pending_resolution += 1;
        await this.recordSchedulePublishImpact({
          schedule,
          showId: removed.id,
          actorId: userId,
          externalId: removed.externalId,
          impactKind: 'confirmed_future_pending_resolution',
          changedFields: ['show_status_id'],
          relationChanges: this.createEmptyRelationChanges(),
          publishRunId: publishRun.id,
        });
        publishSummary.publish_impacts_recorded += 1;
        continue;
      }

      if (this.hasRecordedActuals(removed)) {
        const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);
        const proposedStatusTransition = {
          from: removed.showStatus.systemKey ?? 'DRAFT',
          to: (activeTaskCount > 0 ? 'CANCELLED_PENDING_RESOLUTION' : 'CANCELLED') as 'CANCELLED' | 'CANCELLED_PENDING_RESOLUTION',
        };

        const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
          showId: removed.id,
          scheduleUid: schedule.uid,
          externalId: removed.externalId,
          actorId: userId,
          conflictType: 'removal_held_back',
          heldBack: {
            showFields: null,
            showCreators: [],
            showPlatforms: [],
            proposedStatusTransition,
          },
          publishRunId: publishRun.id,
        });
        if (recorded) {
          publishSummary.publish_impacts_recorded += 1;
        }
        continue;
      }

      const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);
      const targetStatusId = activeTaskCount > 0
        ? statusIds.cancelledPendingResolution
        : statusIds.cancelled;

      if (removed.showStatusId !== targetStatusId) {
        await tx.show.update({
          where: { id: removed.id },
          data: { showStatusId: targetStatusId },
        });
      }

      if (activeTaskCount > 0) {
        publishSummary.shows_pending_resolution += 1;
      } else {
        publishSummary.shows_cancelled += 1;
      }
    }

    const showActualsById = new Map<bigint, boolean>();
    [...currentScheduleShows, ...matchingShows].forEach((show) => {
      showActualsById.set(show.id, show.actualStartTime !== null || show.actualEndTime !== null);
    });

    const { relationChangesByShowId, heldBackRelationsByShowId, rowActualsCandidateShowIds } = await this.relationSyncService.syncShowRelations(
      incomingByShowId,
      uidMaps,
      publishSummary,
      showActualsById,
    );

    for (const [showId, candidate] of staleConflictCandidates.entries()) {
      const heldBackRelations = heldBackRelationsByShowId.get(showId);
      const hasRelationHoldBack = (heldBackRelations?.showCreators.length ?? 0) > 0
        || (heldBackRelations?.showPlatforms.length ?? 0) > 0;
      const heldBack: ScheduleConflictHeldBack | null = (candidate.heldBackFields || hasRelationHoldBack)
        ? {
            showFields: candidate.heldBackFields,
            showCreators: heldBackRelations?.showCreators ?? [],
            showPlatforms: heldBackRelations?.showPlatforms ?? [],
            proposedStatusTransition: null,
          }
        : null;

      const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: candidate.externalId,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack,
        publishRunId: publishRun.id,
      });
      if (recorded) {
        publishSummary.publish_impacts_recorded += 1;
      }
    }

    for (const [showId, heldBackRelations] of heldBackRelationsByShowId.entries()) {
      if (staleConflictCandidates.has(showId)) {
        continue; // already handled above
      }
      const hasRelationHoldBack = heldBackRelations.showCreators.length > 0 || heldBackRelations.showPlatforms.length > 0;
      // Even with nothing held back this publish, a row-actuals candidate
      // still needs to reconcile: a conflict opened by an earlier publish
      // for this show's creator/platform relation may still be pending, and
      // only this call can auto-resolve it once the sheet no longer
      // disagrees with the current relation state.
      if (!hasRelationHoldBack && !rowActualsCandidateShowIds.has(showId)) {
        continue;
      }
      const incoming = incomingByShowId.get(showId);
      const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: incoming?.source.externalId ?? null,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack: hasRelationHoldBack
          ? {
              showFields: null,
              showCreators: heldBackRelations.showCreators,
              showPlatforms: heldBackRelations.showPlatforms,
              proposedStatusTransition: null,
            }
          : null,
        publishRunId: publishRun.id,
      });
      if (recorded) {
        publishSummary.publish_impacts_recorded += 1;
      }
    }

    for (const showId of terminalShowIds) {
      await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: null,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack: null,
        publishRunId: publishRun.id,
      });
    }

    for (const [showId, update] of confirmedFutureUpdates.entries()) {
      const relationChanges = relationChangesByShowId.get(showId) ?? this.createEmptyRelationChanges();
      const relationChangedFields = this.changedRelationFields(relationChanges);
      const changedFields = [...update.changedFields, ...relationChangedFields];

      if (changedFields.length === 0) {
        continue;
      }

      await this.recordSchedulePublishImpact({
        schedule,
        showId,
        actorId: userId,
        externalId: update.incoming.source.externalId,
        impactKind: 'confirmed_future_updated',
        changedFields,
        relationChanges,
        publishRunId: publishRun.id,
      });
      publishSummary.confirmed_shows_updated += 1;
      publishSummary.publish_impacts_recorded += 1;
    }

    await this.backfillTerminalShowCreatorMappings({
      schedule,
      candidates: terminalBackfillCandidates,
      uidMaps,
      publishRunId: publishRun.id,
      actorId: userId,
      publishSummary,
    });

    await this.publishRunService.updatePublishRunSummary(publishRun.id, publishSummary);

    const updatedSchedule = await tx.schedule.update({
      where: { id: schedule.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
        version: { increment: 1 },
      },
      include: {
        client: true,
        studio: true,
        createdByUser: true,
        publishedByUser: true,
      },
    });

    this.logger.log(
      `Diff publish summary schedule_uid=${schedule.uid} created=${publishSummary.shows_created} updated=${publishSummary.shows_updated} cancelled=${publishSummary.shows_cancelled} pending_resolution=${publishSummary.shows_pending_resolution} restored=${publishSummary.shows_restored} preserved=${publishSummary.shows_preserved} skipped=${publishSummary.shows_skipped} impacts=${publishSummary.publish_impacts_recorded} reconciled=${publishSummary.tasks_reconciled}`,
    );

    return {
      schedule: updatedSchedule,
      publishSummary,
    };
  }

  /**
   * Bounded terminal-show creator-mapping backfill step — one explicit call
   * after the main diff+upsert completes; the routine per-show loops above
   * are untouched (see the design spec's §3 boundary). Fill-gap eligibility
   * (zero existing `ShowCreator` rows) is enforced inside the relation-sync
   * service; each backfilled show records a `past_show_creator_backfilled`
   * impact audit stamped with this publish's run id.
   */
  private async backfillTerminalShowCreatorMappings(params: {
    schedule: ScheduleWithRelations;
    candidates: Array<{ existing: ExistingShow; incoming: DiffIncomingShow }>;
    uidMaps: PublishingUidMaps;
    publishRunId: bigint;
    actorId: bigint;
    publishSummary: PublishScheduleSummary;
  }): Promise<void> {
    for (const candidate of params.candidates) {
      const created = await this.relationSyncService.backfillCreatorsForTerminalShow({
        showId: candidate.existing.id,
        incoming: candidate.incoming,
        uidMaps: params.uidMaps,
      });
      if (created === 0) {
        continue;
      }

      params.publishSummary.creator_mappings_backfilled += created;
      await this.recordSchedulePublishImpact({
        schedule: params.schedule,
        showId: candidate.existing.id,
        actorId: params.actorId,
        externalId: candidate.incoming.source.externalId,
        impactKind: 'past_show_creator_backfilled',
        changedFields: [],
        relationChanges: {
          ...this.createEmptyRelationChanges(),
          creator_links_added: created,
        },
        publishRunId: params.publishRunId,
      });
      params.publishSummary.publish_impacts_recorded += 1;
    }
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

  private async recordSchedulePublishImpact(params: {
    schedule: ScheduleWithRelations;
    showId: bigint;
    actorId: bigint;
    externalId: string | null;
    impactKind: 'confirmed_future_updated' | 'confirmed_future_pending_resolution' | 'past_show_creator_backfilled';
    changedFields: string[];
    relationChanges: ShowRelationSyncChanges;
    publishRunId: bigint;
  }): Promise<void> {
    await this.auditService.create({
      action: 'UPDATE',
      actorId: params.actorId,
      reason: null,
      publishRunId: params.publishRunId,
      metadata: {
        event: SCHEDULE_PUBLISH_IMPACT_EVENT,
        schedule_uid: params.schedule.uid,
        external_id: params.externalId,
        impact_kind: params.impactKind,
        changed_fields: params.changedFields,
        relation_changes: params.relationChanges,
        source: 'google_sheets_schedule_publish',
      },
      targets: [
        {
          targetType: 'SHOW',
          targetId: params.showId,
        },
      ],
    });
  }

  private isTerminalStatus(show: ExistingShow, preservedStatusKeys: Set<string>): boolean {
    const statusKey = show.showStatus.systemKey;
    return statusKey !== null && preservedStatusKeys.has(statusKey);
  }

  private hasRecordedActuals(show: ExistingShow): boolean {
    return show.actualStartTime !== null || show.actualEndTime !== null;
  }

  private isIncomingPastOrDone(
    show: DiffIncomingShow,
    statusKey: string | null,
    publishDate: Date,
  ): boolean {
    return this.isBeforePublishDate(new Date(show.source.startTime), publishDate)
      || (statusKey !== null && PRESERVED_STATUS_KEYS.has(statusKey));
  }

  private isConfirmedFuture(show: ExistingShow, publishDate: Date): boolean {
    return show.showStatus.systemKey === CONFIRMED_STATUS_KEY
      && !this.isBeforePublishDate(show.startTime, publishDate);
  }

  private isBeforePublishDate(showDate: Date, publishDate: Date): boolean {
    return this.formatScheduleOperationalDate(showDate) < this.formatScheduleOperationalDate(publishDate);
  }

  private formatScheduleOperationalDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SCHEDULE_INTEGRATION_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const byType = new Map(parts.map((part) => [part.type, part.value]));
    const operationalDate = new Date(Date.UTC(
      Number(byType.get('year')),
      Number(byType.get('month')) - 1,
      Number(byType.get('day')),
    ));

    if (Number(byType.get('hour')) < OPERATIONAL_DAY_START_HOUR) {
      operationalDate.setUTCDate(operationalDate.getUTCDate() - 1);
    }

    return operationalDate.toISOString().slice(0, 10);
  }

  private createEmptyRelationChanges(): ShowRelationSyncChanges {
    return {
      creator_links_added: 0,
      creator_links_updated: 0,
      creator_links_removed: 0,
      platform_links_added: 0,
      platform_links_updated: 0,
      platform_links_removed: 0,
    };
  }

  private changedRelationFields(changes: ShowRelationSyncChanges): string[] {
    return Object.entries(changes)
      .filter(([, count]) => count > 0)
      .map(([field]) => field);
  }

  private async resolveStatusSystemKeys(statusIds: bigint[]): Promise<Map<bigint, string | null>> {
    if (statusIds.length === 0) {
      return new Map();
    }

    const statuses = await this.txHost.tx.showStatus.findMany({
      where: {
        id: { in: statusIds },
      },
      select: {
        id: true,
        systemKey: true,
      },
    });

    return new Map(statuses.map((status) => [status.id, status.systemKey ?? null]));
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
