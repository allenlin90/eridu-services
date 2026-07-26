import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowPlatform } from '@prisma/client';

import type { AuditTargetType } from '@eridu/api-types/audits';
import type {
  CancelShowWithResolutionInput,
  HeldBackPayload,
  PublishRunRow,
  RequestCancellationResolutionInput,
  ResolveScheduleConflictInput,
  ResolveShowCancellationInput,
  ScheduleConflictResolutionStatus,
  SchedulePublishImpactKind,
  SchedulePublishImpactRow,
  SchedulePublishImpactSummary,
} from '@eridu/api-types/shows';

import { CorrectShowPlatformPerformanceDto } from './schemas/correct-show-platform-performance.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import type { SchedulePublishImpactAuditTarget, SchedulePublishImpactQueryFilters } from '@/models/audit/audit.repository';
import { AuditService } from '@/models/audit/audit.service';
import { PlatformService } from '@/models/platform/platform.service';
import { PublishRunService } from '@/models/publish-run/publish-run.service';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleConflictService } from '@/models/schedule-conflict/schedule-conflict.service';
import type { ShowWithPayload } from '@/models/show/schemas/show.schema';
import {
  CreateStudioShowDto,
  studioShowDetailInclude,
  UpdateStudioShowDto,
} from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { UserService } from '@/models/user/user.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

type ShowCreateData = Omit<Parameters<ShowRepository['create']>[0], 'uid'>;
type ShowUpdateData = Parameters<ShowRepository['update']>[1];
type CorrectedMetricColumn = 'gmv' | 'viewer_count' | 'ctr' | 'cto';
type SchedulePublishImpactQuery = {
  page?: number;
  limit?: number;
  start_date_from?: string;
  start_date_to?: string;
  changed_from?: string;
  changed_to?: string;
  impact_kind?: SchedulePublishImpactKind | SchedulePublishImpactKind[];
  resolution_status?: ScheduleConflictResolutionStatus | ScheduleConflictResolutionStatus[];
  publish_run_id?: string;
};

/** Impact kinds served by the confirmed-future audit query (everything except stale_conflict). */
const NON_STALE_IMPACT_KINDS: SchedulePublishImpactKind[] = [
  'confirmed_future_updated',
  'confirmed_future_pending_resolution',
  'past_show_creator_backfilled',
];

@Injectable()
export class StudioShowManagementService {
  constructor(
    private readonly studioService: StudioService,
    private readonly studioRoomService: StudioRoomService,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly showRepository: ShowRepository,
    private readonly platformService: PlatformService,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showOrchestrationService: ShowOrchestrationService,
    private readonly userService: UserService,
    private readonly showCancellationGateService: ShowCancellationGateService,
    private readonly showStatusService: ShowStatusService,
    private readonly taskService: TaskService,
    private readonly auditService: AuditService,
    private readonly scheduleConflictService: ScheduleConflictService,
    private readonly taskTargetService: TaskTargetService,
    private readonly publishRunService: PublishRunService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  @Transactional()
  async createShow(studioUid: string, dto: CreateStudioShowDto) {
    const studio = await this.studioService.getStudioById(studioUid);
    await this.ensureStudioRoomBelongsToStudio(studioUid, dto.studioRoomId);
    this.showService.ensureValidActualTimeRange(null, null, {
      actualStartTime: dto.actualStartTime,
      actualEndTime: dto.actualEndTime,
    });
    await this.ensureScheduleBelongsToStudioAndClient(
      studio.id,
      studioUid,
      dto.scheduleId,
      dto.clientId,
    );

    const existingByExternalId = dto.externalId
      ? await this.showRepository.findByClientUidAndExternalId(dto.clientId, dto.externalId, {
        includeDeleted: true,
      })
      : null;

    let showUid: string;
    let showId: bigint;

    if (existingByExternalId?.deletedAt === null) {
      throw HttpError.conflict(
        `Show already exists for client ${dto.clientId} and external_id ${dto.externalId}`,
      );
    }

    if (existingByExternalId && existingByExternalId.studioId !== null && existingByExternalId.studioId !== studio.id) {
      throw HttpError.conflict('SHOW_RESTORE_CONFLICT');
    }

    if (existingByExternalId) {
      const restored = await this.showRepository.update(
        { id: existingByExternalId.id },
        this.buildCreateRestorePayload(studioUid, dto),
      );
      showUid = restored.uid;
      showId = restored.id;
    } else {
      const created = await this.showService.createShow(
        this.buildCreatePayload(studioUid, dto),
      );
      showUid = created.uid;
      showId = created.id;
    }

    await this.replaceShowPlatforms(showId, dto.platformIds);
    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async updateShow(studioUid: string, showUid: string, dto: UpdateStudioShowDto) {
    const existingShow = await this.findStudioShowOrThrow(studioUid, showUid);
    if (dto.showStatusId !== undefined) {
      if (existingShow.showStatus?.systemKey === 'CANCELLED_PENDING_RESOLUTION') {
        throw HttpError.badRequest('SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION');
      }
      // Block entering the pending-resolution or cancelled state through the
      // generic edit form too — not just leaving it. Setting show_status_id
      // directly here would skip the gate's active-task guard and Audit
      // trail entirely. Only the cancellation gate (cancelShowWithResolution
      // / requestCancellationResolution / resolveShowCancellation) may move
      // a show into either state.
      const targetStatus = await this.showStatusService.getShowStatusById(dto.showStatusId);
      if (targetStatus?.systemKey === 'CANCELLED_PENDING_RESOLUTION') {
        throw HttpError.badRequest('SHOW_STATUS_PENDING_RESOLUTION_REQUIRES_GATE');
      }
      if (targetStatus?.systemKey === 'CANCELLED') {
        throw HttpError.badRequest('SHOW_STATUS_CANCELLATION_REQUIRES_GATE');
      }
    }
    await this.ensureStudioRoomBelongsToStudio(studioUid, dto.studioRoomId);
    // When clientId changes but scheduleId is not explicitly provided, validate the
    // existing schedule against the new clientId to prevent cross-client schedule assignments.
    const scheduleToValidate = dto.scheduleId !== undefined
      ? dto.scheduleId
      : dto.clientId !== undefined
        ? (existingShow.Schedule?.uid ?? null)
        : undefined;
    // existingShow.studioId is non-null: the show was fetched via studio-scoped query
    await this.ensureScheduleBelongsToStudioAndClient(
      existingShow.studioId!,
      studioUid,
      scheduleToValidate,
      dto.clientId ?? existingShow.client?.uid,
    );
    this.ensureValidTimeRange(existingShow.startTime, existingShow.endTime, dto);
    this.showService.ensureValidActualTimeRange(
      existingShow.actualStartTime,
      existingShow.actualEndTime,
      { actualStartTime: dto.actualStartTime, actualEndTime: dto.actualEndTime },
    );

    const oldStartTime = existingShow.startTime;
    const oldEndTime = existingShow.endTime;

    const newStartTime = dto.startTime ? new Date(dto.startTime) : oldStartTime;
    const newEndTime = dto.endTime ? new Date(dto.endTime) : oldEndTime;

    const timeChanged
      = oldStartTime.getTime() !== newStartTime.getTime()
      || oldEndTime.getTime() !== newEndTime.getTime();

    await this.showRepository.update({ uid: showUid }, this.buildUpdatePayload(dto));

    if (timeChanged) {
      await this.taskService.reconcileTaskDueDates(
        existingShow.id,
        { startTime: oldStartTime, endTime: oldEndTime },
        { startTime: newStartTime, endTime: newEndTime },
      );
    }

    if (dto.platformIds !== undefined) {
      await this.replaceShowPlatforms(existingShow.id, dto.platformIds);
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  async getShowDetail(studioUid: string, showUid: string) {
    return this.findStudioShowOrThrow(studioUid, showUid);
  }

  private static readonly CANCELLATION_INELIGIBLE_STATUSES = [
    'CANCELLED_PENDING_RESOLUTION',
    'CANCELLED',
    'COMPLETED',
  ];

  @Transactional()
  async cancelShowWithResolution(
    studioUid: string,
    showUid: string,
    dto: CancelShowWithResolutionInput,
    studioRole: string | undefined,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const currentStatus = show.showStatus?.systemKey ?? null;
    if (currentStatus === null || StudioShowManagementService.CANCELLATION_INELIGIBLE_STATUSES.includes(currentStatus)) {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_ALLOWED');
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const tier = await this.showCancellationGateService.resolveActorTier(studioUid, studioRole, { id: actor.id });
    if (!tier) {
      throw HttpError.forbidden('CANCELLATION_NOT_AUTHORIZED');
    }

    const actorRef = { id: actor.id, uid: actor.uid, name: actor.name };

    if (tier === 'manager') {
      if (!dto.outcome) {
        throw HttpError.badRequest('OUTCOME_REQUIRED');
      }
      await this.showCancellationGateService.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: currentStatus,
        outcome: dto.outcome,
        reasonCategory: dto.reason_category,
        reasonNote: dto.reason_note,
        actor: actorRef,
      });
    } else {
      throw HttpError.forbidden('DIRECT_CANCELLATION_REQUIRES_MANAGER');
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async requestCancellationResolution(
    studioUid: string,
    showUid: string,
    dto: RequestCancellationResolutionInput,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const currentStatus = show.showStatus?.systemKey ?? null;
    if (currentStatus === null || StudioShowManagementService.CANCELLATION_INELIGIBLE_STATUSES.includes(currentStatus)) {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_ALLOWED');
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const isActiveDutyManager = await this.showCancellationGateService.isActiveDutyManager(studioUid, { id: actor.id });
    if (!isActiveDutyManager) {
      throw HttpError.forbidden('CANCELLATION_NOT_AUTHORIZED');
    }

    await this.showCancellationGateService.openPending({
      show,
      gateKind: 'show_cancellation',
      fromStatusSystemKey: currentStatus,
      reasonCategory: dto.reason_category,
      reasonNote: dto.reason_note,
      actor: { id: actor.id, uid: actor.uid, name: actor.name },
    });

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async resolveShowCancellation(
    studioUid: string,
    showUid: string,
    dto: ResolveShowCancellationInput,
    studioRole: string | undefined,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_PENDING');
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const tier = await this.showCancellationGateService.resolveActorTier(studioUid, studioRole, { id: actor.id });
    if (tier !== 'manager') {
      throw HttpError.forbidden('SIGN_OFF_REQUIRES_MANAGER');
    }

    const status = await this.showCancellationGateService.getCancellationStatus(show);
    // Shows parked in CANCELLED_PENDING_RESOLUTION by schedule-publish (or any
    // other pre-gate write) have no opening Audit row, so gateKind comes back
    // null even though the show is genuinely pending. 'show_cancellation' is
    // the only GateKind today — default to it instead of leaving these shows
    // permanently stuck with no sign-off path.
    const gateKind = status.gateKind ?? 'show_cancellation';

    await this.showCancellationGateService.resolvePending({
      show,
      gateKind,
      outcome: dto.outcome,
      resolutionNotes: dto.resolution_notes,
      actor: { id: actor.id, uid: actor.uid, name: actor.name },
    });

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  /**
   * Deliberately NOT `@Transactional()`. The apply branch's eligibility
   * check (and its conditional auto-resolve write) and the eventual apply
   * writes must land in two genuinely separate, independently-committing
   * transactions — see `ScheduleConflictService.checkEligibility` for why a
   * single ambient transaction can't both durably write the auto-resolve
   * audit row and propagate the `SHOW_NO_LONGER_ELIGIBLE` throw to the
   * caller. This method orchestrates those two calls with a throw in
   * between, at a point where no transaction is open.
   */
  async resolveScheduleConflict(
    studioUid: string,
    showUid: string,
    conflictUid: string,
    dto: ResolveScheduleConflictInput,
    actorExtId: string,
  ): Promise<SchedulePublishImpactRow> {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    if (dto.action === 'dismiss') {
      await this.scheduleConflictService.dismissConflict({
        showId: show.id,
        conflictUid,
        actorId: actor.id,
        reason: dto.reason,
      });
    } else {
      const eligibility = await this.scheduleConflictService.checkEligibility({
        showId: show.id,
        conflictUid,
        currentShowStatus: show.showStatus?.systemKey ?? '',
      });
      if (!eligibility.eligible) {
        // No transaction is open here — checkEligibility's transaction has
        // already committed its auto-resolve write, so this throw is safe.
        throw HttpError.conflict('SHOW_NO_LONGER_ELIGIBLE');
      }

      const latest = await this.auditService.findLatestScheduleConflictForShow(show.id);
      const metadata = this.asRecord(latest?.metadata);
      const heldBack = metadata.held_back as HeldBackPayload | undefined;
      const changedFields = heldBack?.show_fields?.changed_fields ?? [];
      const conflictType = metadata.conflict_type as 'update_held_back' | 'removal_held_back' | undefined;

      await this.applyEligibleScheduleConflict({
        show,
        studioUid,
        conflictUid,
        actorId: actor.id,
        reason: dto.reason,
        conflictType,
        changedFields,
        heldBack,
      });
    }

    const updatedAudit = await this.auditService.findLatestScheduleConflictForShow(show.id);
    if (!updatedAudit) {
      throw HttpError.internalServerError('SCHEDULE_CONFLICT_RESOLUTION_LOOKUP_FAILED');
    }
    const refreshedShow = await this.findStudioShowOrThrow(studioUid, showUid);

    return this.toSchedulePublishImpactRow({
      audit: updatedAudit,
      show: refreshedShow,
    } as unknown as SchedulePublishImpactAuditTarget);
  }

  /**
   * The apply flow's second transaction, run only after
   * `resolveScheduleConflict` has confirmed eligibility in its own,
   * already-committed transaction. `ScheduleConflictService.applyConflict`
   * re-acquires the showId advisory lock and re-verifies the pending
   * conflict, then this method's own writes (task due-date reconciliation,
   * show field updates, held-back relation sync) land in the same
   * transaction. Safe to throw freely here (`CONFLICT_STATE_CHANGED`, or the
   * narrow-race `SHOW_NO_LONGER_ELIGIBLE`) since nothing is written until
   * `applyConflict`'s own resolved-audit write.
   */
  @Transactional()
  private async applyEligibleScheduleConflict(params: {
    show: ShowWithPayload<typeof studioShowDetailInclude>;
    studioUid: string;
    conflictUid: string;
    actorId: bigint;
    reason: string;
    conflictType: 'update_held_back' | 'removal_held_back' | undefined;
    changedFields: string[];
    heldBack: HeldBackPayload | undefined;
  }): Promise<void> {
    const { show, studioUid, conflictUid, actorId, reason, conflictType, changedFields, heldBack } = params;

    await this.scheduleConflictService.applyConflict({
      showId: show.id,
      conflictUid,
      actorId,
      reason,
      // Invoked by applyConflict only after it holds the showId advisory
      // lock, so this re-reads the show fresh instead of reusing the
      // snapshot resolveScheduleConflict read before any lock was taken.
      loadCurrentState: async () => {
        const freshShow = await this.findStudioShowOrThrow(studioUid, show.uid);
        return {
          currentShowStatus: freshShow.showStatus?.systemKey ?? '',
          currentFieldValues: await this.buildCurrentFieldValues(freshShow, changedFields),
          currentRelationValues: await this.buildCurrentRelationValues(freshShow, heldBack),
        };
      },
    });

    if (conflictType === 'update_held_back' && (changedFields.includes('start_time') || changedFields.includes('end_time'))) {
      const showFields = heldBack?.show_fields;
      if (showFields) {
        const oldStart = this.toDiffDate(showFields.old.start_time, show.startTime);
        const oldEnd = this.toDiffDate(showFields.old.end_time, show.endTime);
        const newStart = this.toDiffDate(showFields.new.start_time, oldStart);
        const newEnd = this.toDiffDate(showFields.new.end_time, oldEnd);
        await this.taskService.reconcileTaskDueDates(
          show.id,
          { startTime: oldStart, endTime: oldEnd },
          { startTime: newStart, endTime: newEnd },
        );
      }
    }

    if (conflictType === 'removal_held_back') {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(show.id);
      const targetStatus = await this.showStatusService.getShowStatusBySystemKey(
        activeTaskCount > 0 ? 'CANCELLED_PENDING_RESOLUTION' : 'CANCELLED',
      );
      if (targetStatus) {
        await this.showRepository.update({ id: show.id }, { showStatus: { connect: { id: targetStatus.id } } });
      }
    } else {
      if (heldBack?.show_fields) {
        await this.showRepository.update({ id: show.id }, this.toShowUpdateData(heldBack.show_fields));
      }
      await this.applyHeldBackRelations(show.id, heldBack);
    }
  }

  /** Parses a snapshot field value into a `Date`, falling back to `fallback` when the field wasn't part of the diff (or, defensively, a live show row missing that field). */
  private toDiffDate(value: unknown, fallback: Date): Date {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return fallback instanceof Date ? fallback : new Date(Number.NaN);
  }

  private async buildCurrentFieldValues(
    show: ShowWithPayload<typeof studioShowDetailInclude>,
    changedFields: string[],
  ): Promise<Record<string, unknown>> {
    const values: Record<string, unknown> = {};
    for (const field of changedFields) {
      switch (field) {
        case 'name':
          values.name = show.name;
          break;
        case 'start_time':
          values.start_time = show.startTime ? show.startTime.toISOString() : null;
          break;
        case 'end_time':
          values.end_time = show.endTime ? show.endTime.toISOString() : null;
          break;
        case 'client_id':
          values.client_id = show.client?.uid ?? null;
          break;
        case 'studio_id':
          values.studio_id = show.studio?.uid ?? null;
          break;
        case 'studio_room_id':
          values.studio_room_id = show.studioRoom?.uid ?? null;
          break;
        case 'show_type_id':
          values.show_type_id = show.showType?.uid ?? null;
          break;
        case 'show_status_id':
          values.show_status_id = show.showStatus?.uid ?? null;
          break;
        case 'show_standard_id':
          values.show_standard_id = show.showStandard?.uid ?? null;
          break;
        case 'metadata':
          values.metadata = JSON.stringify(show.metadata ?? {});
          break;
        default:
          break;
      }
    }
    return values;
  }

  /**
   * Current relation values for every creator/platform referenced in the
   * pending conflict's held-back snapshot, keyed by uid — feeds
   * `applyConflict`'s relation drift check. A uid missing from the returned
   * map means that relation row no longer exists (soft-deleted or gone).
   */
  private async buildCurrentRelationValues(
    show: ShowWithPayload<typeof studioShowDetailInclude>,
    heldBack: HeldBackPayload | undefined,
  ): Promise<{
      showCreators: Record<string, string | null>;
      showPlatforms: Record<string, { liveStreamLink: string | null; platformShowId: string | null }>;
    }> {
    const creatorUids = (heldBack?.show_creators ?? []).map((entry) => entry.creator_uid);
    const showCreators: Record<string, string | null> = {};
    if (creatorUids.length > 0) {
      const rows = await this.txHost.tx.showCreator.findMany({
        where: { showId: show.id, deletedAt: null, creator: { uid: { in: creatorUids } } },
        include: { creator: { select: { uid: true } } },
      });
      for (const row of rows) {
        showCreators[row.creator.uid] = row.note;
      }
    }

    const showPlatforms: Record<string, { liveStreamLink: string | null; platformShowId: string | null }> = {};
    for (const showPlatform of show.showPlatforms ?? []) {
      const platformUid = showPlatform.platform?.uid;
      if (platformUid) {
        showPlatforms[platformUid] = {
          liveStreamLink: showPlatform.liveStreamLink ?? null,
          platformShowId: showPlatform.platformShowId ?? null,
        };
      }
    }

    return { showCreators, showPlatforms };
  }

  /**
   * Only plain scalar fields are ever applied here — FK fields inside a real
   * held_back diff are display-only for this MVP; a planner backfilling a
   * creator/platform, not a client/studio/room, is the documented common
   * case. Held-back creator/platform *relation* changes, by contrast, are
   * fully applied via `applyHeldBackRelations` below — this gap only covers
   * the six FK-backed `show_fields` entries, not relations. If FK-field
   * apply is needed later, resolve `{uid,name}` back to an internal id here
   * before writing. `metadata` is a plain scalar (JSON, not FK-backed), so
   * it is applied here like `name`/`start_time`/`end_time`.
   */
  private toShowUpdateData(showFields: { new: Record<string, unknown> }): ShowUpdateData {
    const data: ShowUpdateData = {};
    if (typeof showFields.new.name === 'string')
      data.name = showFields.new.name;
    if (typeof showFields.new.start_time === 'string')
      data.startTime = new Date(showFields.new.start_time);
    if (typeof showFields.new.end_time === 'string')
      data.endTime = new Date(showFields.new.end_time);
    if (typeof showFields.new.metadata === 'string') {
      try {
        data.metadata = JSON.parse(showFields.new.metadata);
      } catch {
        // Leave metadata untouched if the stored string somehow isn't valid JSON.
      }
    }
    return data;
  }

  /**
   * Applies a held-back creator/platform diff by resolving each entry's uid
   * back to the underlying row and writing the same action relation-sync
   * would have written directly, had it not been held back — `update` writes
   * the new note/link fields, `remove` soft-deletes. `restore` (nothing to
   * conflict with) never reaches here since additions/restores always apply
   * at publish time and are never held back in the first place.
   */
  private async applyHeldBackRelations(showId: bigint, heldBack: HeldBackPayload | undefined): Promise<void> {
    const tx = this.txHost.tx;

    for (const entry of heldBack?.show_creators ?? []) {
      const creator = await tx.creator.findFirst({ where: { uid: entry.creator_uid }, select: { id: true } });
      if (!creator) {
        continue;
      }
      const row = await tx.showCreator.findFirst({ where: { showId, creatorId: creator.id }, select: { id: true } });
      if (!row) {
        continue;
      }
      if (entry.action === 'remove') {
        await tx.showCreator.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
      } else {
        await tx.showCreator.update({ where: { id: row.id }, data: { note: entry.new_note } });
      }
    }

    for (const entry of heldBack?.show_platforms ?? []) {
      const platform = await tx.platform.findFirst({ where: { uid: entry.platform_uid }, select: { id: true } });
      if (!platform) {
        continue;
      }
      const row = await tx.showPlatform.findFirst({ where: { showId, platformId: platform.id }, select: { id: true } });
      if (!row) {
        continue;
      }
      if (entry.action === 'remove') {
        await tx.showPlatform.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
      } else {
        await tx.showPlatform.update({
          where: { id: row.id },
          data: { liveStreamLink: entry.new.live_stream_link, platformShowId: entry.new.platform_show_id },
        });
      }
    }
  }

  async getCancellationStatus(studioUid: string, showUid: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    return this.showCancellationGateService.getCancellationStatus(show);
  }

  async listSchedulePublishImpacts(
    studioUid: string,
    query: SchedulePublishImpactQuery,
  ): Promise<{ items: SchedulePublishImpactRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const plan = await this.resolveImpactQueryPlan(query);
    const empty = { items: [] as SchedulePublishImpactAuditTarget[], total: 0 };

    const [confirmedFuture, staleConflicts, resolvedConflicts] = await Promise.all([
      plan.includeConfirmed
        ? this.auditService.findSchedulePublishImpactsForStudio(studioUid, {
            ...plan.confirmedFilters,
            skip,
            take: limit,
          })
        : Promise.resolve(empty),
      plan.includeStale
        ? this.auditService.findPendingStaleConflictsForStudio(studioUid, {
            ...plan.staleFilters,
            skip,
            take: limit,
          })
        : Promise.resolve(empty),
      plan.includeResolvedStale
        ? this.auditService.findResolvedStaleConflictsForStudio(studioUid, {
            ...plan.resolvedStaleFilters,
            skip,
            take: limit,
          })
        : Promise.resolve(empty),
    ]);

    return {
      items: [
        ...confirmedFuture.items.map((item) => this.toSchedulePublishImpactRow(item)),
        ...staleConflicts.items.map((item) => this.toSchedulePublishImpactRow(item)),
        ...resolvedConflicts.items.map((item) => this.toSchedulePublishImpactRow(item)),
      ],
      total: confirmedFuture.total + staleConflicts.total + resolvedConflicts.total,
    };
  }

  /**
   * KPI-card aggregate over the exact same filter plan and repository
   * where-builders as `listSchedulePublishImpacts`, so the cards always match
   * the full filtered result set (never the current page).
   */
  async getSchedulePublishImpactSummary(
    studioUid: string,
    query: SchedulePublishImpactQuery,
  ): Promise<SchedulePublishImpactSummary> {
    const plan = await this.resolveImpactQueryPlan(query);

    const countKind = (kind: SchedulePublishImpactKind): Promise<number> => {
      const kindsInPlan = plan.confirmedFilters.impactKinds ?? NON_STALE_IMPACT_KINDS;
      if (!plan.includeConfirmed || !kindsInPlan.includes(kind)) {
        return Promise.resolve(0);
      }
      return this.auditService.countSchedulePublishImpactsForStudio(studioUid, {
        ...plan.confirmedFilters,
        impactKinds: [kind],
      });
    };

    const [updated, pendingResolution, backfilled, stalePending, staleResolved] = await Promise.all([
      countKind('confirmed_future_updated'),
      countKind('confirmed_future_pending_resolution'),
      countKind('past_show_creator_backfilled'),
      plan.includeStale
        ? this.auditService.countPendingStaleConflictsForStudio(studioUid, plan.staleFilters)
        : Promise.resolve(0),
      plan.includeResolvedStale
        ? this.auditService.countResolvedStaleConflictsForStudio(studioUid, plan.resolvedStaleFilters)
        : Promise.resolve(0),
    ]);

    return {
      total: updated + pendingResolution + backfilled + stalePending + staleResolved,
      confirmed_future_updated: updated,
      confirmed_future_pending_resolution: pendingResolution,
      stale_conflict_pending: stalePending,
      stale_conflict_resolved: staleResolved,
      past_show_creator_backfilled: backfilled,
    };
  }

  async listPublishRuns(
    studioUid: string,
    query: { page?: number; limit?: number },
  ): Promise<{ items: PublishRunRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const { items, total } = await this.publishRunService.getPublishRunsForStudio(studioUid, {
      skip,
      take: limit,
    });

    return {
      items: items.map((run) => ({
        id: run.uid,
        source: run.source as PublishRunRow['source'],
        schedule_id: run.schedule?.uid ?? null,
        triggered_by: run.triggeredBy
          ? { id: run.triggeredBy.uid, name: run.triggeredBy.name ?? null }
          : null,
        summary: this.numberRecord(run.summary),
        created_at: run.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Resolves the shared filter plan for the impacts list and its summary.
   *
   * Date semantics: the legacy implicit "upcoming shows only" default
   * (`startTime >= now`) applies ONLY to the untouched default view, and even
   * there it exempts `past_show_creator_backfilled` — those rows only exist on
   * terminal (past) shows, so the default view still lists and counts them.
   * Any explicit narrowing filter (impact kind, publish run, change-time
   * range, or an explicit show-time bound) lifts the default entirely, so
   * past-show rows — e.g. a run drill-down from the Runs tab — stay
   * reachable. The pending-stale source never receives the implicit default:
   * past-dated shows are the entire point of that queue.
   *
   * `resolution_status` routes between the two stale sources: `pending`
   * selects the live review queue (latest-per-show, `lifecycle: 'opened'`),
   * while resolved statuses (`applied`, `dismissed`, `superseded`,
   * `auto_resolved_no_longer_conflicting`) select the append-only resolution
   * history rows matching those outcomes. Non-stale rows carry no resolution
   * status, so any `resolution_status` filter excludes them.
   */
  private async resolveImpactQueryPlan(query: SchedulePublishImpactQuery): Promise<{
    includeConfirmed: boolean;
    includeStale: boolean;
    includeResolvedStale: boolean;
    confirmedFilters: SchedulePublishImpactQueryFilters;
    staleFilters: SchedulePublishImpactQueryFilters;
    resolvedStaleFilters: SchedulePublishImpactQueryFilters & { outcomes?: string[] };
  }> {
    const kinds = this.normalizeToArray(query.impact_kind);
    const resolutionStatuses = this.normalizeToArray(query.resolution_status);
    const resolvedOutcomes = resolutionStatuses?.filter((status) => status !== 'pending');

    let publishRunId: bigint | undefined;
    let unknownPublishRun = false;
    if (query.publish_run_id) {
      const run = await this.publishRunService.getPublishRunByUid(query.publish_run_id);
      if (run) {
        publishRunId = run.id;
      } else {
        // Unknown run uid → empty result set, mirroring how unknown uid
        // filters behave elsewhere in list queries.
        unknownPublishRun = true;
      }
    }

    const hasExplicitScope = Boolean(
      query.start_date_from
      || query.start_date_to
      || query.impact_kind
      || query.publish_run_id
      || query.changed_from
      || query.changed_to,
    );

    const shared: SchedulePublishImpactQueryFilters = {
      startDateTo: query.start_date_to ? new Date(query.start_date_to) : undefined,
      changedFrom: query.changed_from ? new Date(query.changed_from) : undefined,
      changedTo: query.changed_to ? new Date(query.changed_to) : undefined,
      publishRunId,
    };

    const explicitStartDateFrom = query.start_date_from ? new Date(query.start_date_from) : undefined;
    const nonStaleKinds = kinds?.filter((kind) => kind !== 'stale_conflict');

    return {
      includeConfirmed: !unknownPublishRun
        && resolutionStatuses === undefined
        && (kinds === undefined || (nonStaleKinds?.length ?? 0) > 0),
      includeStale: !unknownPublishRun
        && (kinds === undefined || kinds.includes('stale_conflict'))
        && (resolutionStatuses === undefined || resolutionStatuses.includes('pending')),
      // Resolved history is opt-in only: the untouched default view stays
      // confirmed + pending, matching the review queue's purpose.
      includeResolvedStale: !unknownPublishRun
        && (kinds === undefined || kinds.includes('stale_conflict'))
        && (resolvedOutcomes?.length ?? 0) > 0,
      confirmedFilters: {
        ...shared,
        startDateFrom: explicitStartDateFrom,
        implicitStartDateFrom: hasExplicitScope ? undefined : new Date(),
        impactKinds: kinds === undefined ? undefined : nonStaleKinds,
      },
      staleFilters: {
        ...shared,
        startDateFrom: explicitStartDateFrom,
      },
      resolvedStaleFilters: {
        ...shared,
        startDateFrom: explicitStartDateFrom,
        outcomes: resolvedOutcomes,
      },
    };
  }

  private normalizeToArray<T>(value: T | T[] | undefined): T[] | undefined {
    if (value === undefined) {
      return undefined;
    }
    return Array.isArray(value) ? value : [value];
  }

  async listShowAudits(
    studioUid: string,
    showUid: string,
    query: { page?: number; limit?: number },
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const filters = [{ targetType: 'SHOW' as const, targetId: show.id }];

    const [total, items] = await Promise.all([
      this.auditService.countForTargets(filters),
      this.auditService.findForTargets(filters, { skip, take: limit }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.uid,
        action: item.action,
        actor_uid: item.actor?.uid ?? null,
        ip_address: item.ipAddress ?? null,
        user_agent: item.userAgent ?? null,
        reason: item.reason ?? null,
        metadata: item.metadata,
        targets: item.targets.map((t) => {
          let targetUid = '';
          switch (t.targetType) {
            case 'SHOW':
              targetUid = t.show?.uid ?? show.uid;
              break;
            case 'SHOW_CREATOR':
              targetUid = t.showCreator?.uid ?? '';
              break;
            case 'SHOW_PLATFORM':
              targetUid = t.showPlatform?.uid ?? '';
              break;
            case 'STUDIO_SHIFT':
              targetUid = t.studioShift?.uid ?? '';
              break;
            default:
              break;
          }
          return {
            target_type: t.targetType as AuditTargetType,
            target_uid: targetUid,
          };
        }),
        created_at: item.createdAt.toISOString(),
      })),
      total,
    };
  }

  @Transactional()
  async deleteShow(studioUid: string, showUid: string): Promise<void> {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);

    if (show.startTime <= new Date()) {
      throw HttpError.badRequest('SHOW_ALREADY_STARTED');
    }

    await this.showOrchestrationService.deleteShow(showUid);
  }

  private async findStudioShowOrThrow(
    studioUid: string,
    showUid: string,
  ): Promise<ShowWithPayload<typeof studioShowDetailInclude>> {
    const show = await this.showRepository.findByUidAndStudioUid(
      showUid,
      studioUid,
      studioShowDetailInclude,
    );

    if (!show) {
      throw HttpError.notFound('Show', showUid);
    }

    return show;
  }

  private toSchedulePublishImpactRow(
    target: SchedulePublishImpactAuditTarget,
  ): SchedulePublishImpactRow {
    if (!target.show) {
      throw HttpError.notFound('Show', String(target.targetId));
    }

    const metadata = this.asRecord(target.audit.metadata);
    const isStaleConflict = metadata.impact_kind === 'stale_conflict';

    const changedFields = isStaleConflict
      ? this.staleConflictChangedFields(metadata)
      : (Array.isArray(metadata.changed_fields)
          ? metadata.changed_fields.filter((field): field is string => typeof field === 'string')
          : []);

    const relationChanges = isStaleConflict ? {} : this.numberRecord(metadata.relation_changes);

    const impactKind = isStaleConflict
      ? 'stale_conflict' as const
      : metadata.impact_kind === 'confirmed_future_pending_resolution'
        ? 'confirmed_future_pending_resolution' as const
        : metadata.impact_kind === 'past_show_creator_backfilled'
          ? 'past_show_creator_backfilled' as const
          : 'confirmed_future_updated' as const;

    return {
      audit_id: target.audit.uid,
      impact_kind: impactKind,
      schedule_id: typeof metadata.schedule_uid === 'string' ? metadata.schedule_uid : null,
      external_id: typeof metadata.external_id === 'string' ? metadata.external_id : null,
      changed_fields: changedFields,
      relation_changes: relationChanges,
      conflict_uid: isStaleConflict && typeof metadata.conflict_uid === 'string' ? metadata.conflict_uid : null,
      conflict_type: isStaleConflict ? (metadata.conflict_type as 'update_held_back' | 'removal_held_back' | undefined) ?? null : null,
      // A resolved stale_conflict Audit row retains its original `impact_kind`
      // (see writeResolved) but flips `lifecycle` to 'resolved' and records
      // `outcome` — surface that outcome here instead of always reporting the
      // still-pending status, or a just-applied/dismissed conflict's response
      // row would misreport itself as 'pending'.
      resolution_status: isStaleConflict
        ? (metadata.lifecycle === 'resolved' && typeof metadata.outcome === 'string'
            ? (metadata.outcome as SchedulePublishImpactRow['resolution_status'])
            : 'pending')
        : null,
      held_back: isStaleConflict ? (metadata.held_back as SchedulePublishImpactRow['held_back']) ?? null : null,
      show: {
        id: target.show.uid,
        name: target.show.name,
        external_id: target.show.externalId,
        start_time: target.show.startTime?.toISOString() ?? '',
        end_time: target.show.endTime?.toISOString() ?? '',
        status_name: target.show.showStatus?.name ?? null,
        status_system_key: target.show.showStatus?.systemKey ?? null,
        client_id: target.show.client?.uid ?? null,
        client_name: target.show.client?.name ?? null,
      },
      created_at: target.audit.createdAt?.toISOString() ?? '',
    };
  }

  private staleConflictChangedFields(metadata: Record<string, unknown>): string[] {
    const heldBack = metadata.held_back as { show_fields?: { changed_fields?: unknown } } | undefined;
    const fields = heldBack?.show_fields?.changed_fields;
    return Array.isArray(fields) ? fields.filter((f): f is string => typeof f === 'string') : [];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private numberRecord(value: unknown): Record<string, number> {
    const record = this.asRecord(value);
    return Object.fromEntries(
      Object.entries(record).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    );
  }

  private async ensureStudioRoomBelongsToStudio(
    studioUid: string,
    studioRoomUid?: string | null,
  ): Promise<void> {
    if (studioRoomUid === undefined || studioRoomUid === null) {
      return;
    }

    const room = await this.studioRoomService.findOne({
      uid: studioRoomUid,
      studio: { uid: studioUid },
      deletedAt: null,
    });

    if (!room) {
      throw HttpError.badRequest(`Studio room ${studioRoomUid} does not belong to studio ${studioUid}`);
    }
  }

  private async ensureScheduleBelongsToStudioAndClient(
    studioId: bigint,
    studioUid: string,
    scheduleUid?: string | null,
    expectedClientUid?: string | null,
  ): Promise<void> {
    if (scheduleUid === undefined || scheduleUid === null) {
      return;
    }

    // Use catch-null to avoid leaking schedule existence: a non-existent UID and a
    // wrong-studio UID both surface as the same generic ownership error.
    const schedule = await this.scheduleService.getScheduleById(scheduleUid, {
      client: true,
    }).catch(() => null);
    if (!schedule || !schedule.studioId || schedule.studioId !== studioId) {
      throw HttpError.badRequest(`Schedule ${scheduleUid} does not belong to studio ${studioUid}`);
    }

    if (
      expectedClientUid !== undefined
      && expectedClientUid !== null
      && (!('client' in schedule) || schedule.client?.uid !== expectedClientUid)
    ) {
      throw HttpError.badRequest(
        `Schedule ${scheduleUid} does not belong to client ${expectedClientUid}`,
      );
    }
  }

  private ensureValidTimeRange(
    currentStartTime: Date,
    currentEndTime: Date,
    dto: UpdateStudioShowDto,
  ): void {
    const nextStart = dto.startTime ?? currentStartTime;
    const nextEnd = dto.endTime ?? currentEndTime;

    if (nextEnd <= nextStart) {
      throw HttpError.badRequest('End time must be after start time');
    }
  }

  private buildCreatePayload(
    studioUid: string,
    dto: CreateStudioShowDto,
  ): ShowCreateData {
    return {
      externalId: dto.externalId ?? null,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      actualStartTime: dto.actualStartTime,
      actualEndTime: dto.actualEndTime,
      metadata: dto.metadata ?? {},
      client: { connect: { uid: dto.clientId } },
      studio: { connect: { uid: studioUid } },
      Schedule: dto.scheduleId
        ? { connect: { uid: dto.scheduleId } }
        : undefined,
      studioRoom: dto.studioRoomId
        ? { connect: { uid: dto.studioRoomId } }
        : undefined,
      showType: { connect: { uid: dto.showTypeId } },
      showStatus: { connect: { uid: dto.showStatusId } },
      showStandard: { connect: { uid: dto.showStandardId } },
    };
  }

  private buildCreateRestorePayload(
    studioUid: string,
    dto: CreateStudioShowDto,
  ): ShowUpdateData {
    return {
      externalId: dto.externalId ?? null,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      actualStartTime: dto.actualStartTime,
      actualEndTime: dto.actualEndTime,
      metadata: dto.metadata ?? {},
      client: { connect: { uid: dto.clientId } },
      studio: { connect: { uid: studioUid } },
      Schedule: dto.scheduleId
        ? { connect: { uid: dto.scheduleId } }
        : { disconnect: true },
      studioRoom: dto.studioRoomId
        ? { connect: { uid: dto.studioRoomId } }
        : { disconnect: true },
      showType: { connect: { uid: dto.showTypeId } },
      showStatus: { connect: { uid: dto.showStatusId } },
      showStandard: { connect: { uid: dto.showStandardId } },
      deletedAt: null,
    };
  }

  private buildUpdatePayload(dto: UpdateStudioShowDto): ShowUpdateData {
    const payload: ShowUpdateData = {};

    if (dto.name !== undefined)
      payload.name = dto.name;
    if (dto.startTime !== undefined)
      payload.startTime = dto.startTime;
    if (dto.endTime !== undefined)
      payload.endTime = dto.endTime;
    if (dto.metadata !== undefined)
      payload.metadata = dto.metadata;
    if (dto.clientId !== undefined)
      payload.client = { connect: { uid: dto.clientId } };
    if (dto.scheduleId !== undefined) {
      payload.Schedule = dto.scheduleId
        ? { connect: { uid: dto.scheduleId } }
        : { disconnect: true };
    }
    if (dto.showTypeId !== undefined)
      payload.showType = { connect: { uid: dto.showTypeId } };
    if (dto.showStatusId !== undefined)
      payload.showStatus = { connect: { uid: dto.showStatusId } };
    if (dto.showStandardId !== undefined)
      payload.showStandard = { connect: { uid: dto.showStandardId } };
    if (dto.studioRoomId !== undefined) {
      payload.studioRoom = dto.studioRoomId
        ? { connect: { uid: dto.studioRoomId } }
        : { disconnect: true };
    }
    if (dto.actualStartTime !== undefined)
      payload.actualStartTime = dto.actualStartTime;
    if (dto.actualEndTime !== undefined)
      payload.actualEndTime = dto.actualEndTime;

    return payload;
  }

  private async replaceShowPlatforms(
    showId: bigint,
    platformUids: string[],
  ): Promise<void> {
    const uniquePlatformUids = [...new Set(platformUids)];
    const foundPlatforms = uniquePlatformUids.length > 0
      ? await this.platformService.findActiveByUids(uniquePlatformUids)
      : [];

    if (foundPlatforms.length !== uniquePlatformUids.length) {
      const foundUids = new Set(foundPlatforms.map((platform) => platform.uid));
      const missingUids = uniquePlatformUids.filter((uid) => !foundUids.has(uid));
      throw HttpError.badRequest(`Platforms not found: ${missingUids.join(', ')}`);
    }

    const platformIdByUid = new Map(foundPlatforms.map((platform) => [platform.uid, platform.id]));
    // Fetch all assignments including soft-deleted ones so restore-on-add works correctly
    const existingAssignments = await this.showPlatformRepository.findMany({
      where: { showId },
    });
    const retainedPlatformIds = new Set<bigint>();

    const toRestore: Array<{ id: bigint; liveStreamLink: string | null; platformShowId: string | null; viewerCount: number; metadata: object }> = [];
    const toCreate: Array<{ uid: string; showId: bigint; platformId: bigint; metadata: object }> = [];

    for (const platformUid of uniquePlatformUids) {
      const platformId = platformIdByUid.get(platformUid);
      if (!platformId) {
        continue;
      }

      retainedPlatformIds.add(platformId);
      const existingAssignment = existingAssignments.find(
        (assignment) => assignment.platformId === platformId,
      );

      if (existingAssignment?.deletedAt === null) {
        continue;
      }

      if (existingAssignment) {
        toRestore.push({
          id: existingAssignment.id,
          liveStreamLink: existingAssignment.liveStreamLink,
          platformShowId: existingAssignment.platformShowId,
          viewerCount: existingAssignment.viewerCount,
          metadata: (existingAssignment.metadata as object) ?? {},
        });
        continue;
      }

      toCreate.push({
        uid: this.showPlatformService.generateShowPlatformUid(),
        showId,
        platformId,
        metadata: {},
      });
    }

    const idsToDelete = existingAssignments
      .filter((a) => a.deletedAt === null && !retainedPlatformIds.has(a.platformId))
      .map((a) => a.platformId);

    await Promise.all([
      // Batch create new assignments
      toCreate.length > 0
        ? this.showPlatformRepository.createManyAssignments(toCreate)
        : Promise.resolve(),
      // Batch soft-delete removed assignments
      idsToDelete.length > 0
        ? this.showPlatformRepository.softDeleteByPlatformIds(showId, idsToDelete)
        : Promise.resolve(),
      // Restore soft-deleted assignments (individual updates needed for per-row data)
      ...toRestore.map((item) =>
        this.showPlatformRepository.restoreAndUpdateAssignment(item.id, {
          liveStreamLink: item.liveStreamLink,
          platformShowId: item.platformShowId,
          viewerCount: item.viewerCount,
          metadata: item.metadata,
        }),
      ),
    ]);
  }

  @Transactional()
  async correctShowPlatformPerformance(
    studioUid: string,
    showUid: string,
    showPlatformUid: string,
    dto: CorrectShowPlatformPerformanceDto,
    actorExtId: string,
  ) {
    const [show, actor] = await Promise.all([
      this.findStudioShowOrThrow(studioUid, showUid),
      this.userService.getUserByExtId(actorExtId),
    ]);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const showPlatform = (await this.showPlatformRepository.findByUid(showPlatformUid, {
      platform: true,
    })) as (ShowPlatform & { platform?: { name: string } | null }) | null;
    if (!showPlatform || showPlatform.showId !== show.id || showPlatform.deletedAt !== null) {
      throw HttpError.notFound('ShowPlatform', showPlatformUid);
    }

    const changes: Array<{ field: string; old_value: string | null; new_value: string | null }> = [];
    const pinnedMetrics: Array<{ field: string; value: string | null }> = [];
    const metrics: Array<{ column: CorrectedMetricColumn; value: Prisma.Decimal | number | null }> = [];
    const nextActualsSources: Record<string, string> = {};
    const nextPerformanceTemplates: Record<string, string> = {};
    const metadata = (showPlatform.metadata as Record<string, any> | null) ?? {};
    const currentActualsSources = (metadata.actuals_source as Record<string, string> | undefined) ?? {};

    const checkMetric = (
      field: 'gmv' | 'ctr' | 'cto',
      column: CorrectedMetricColumn,
      factKey: string,
      newValue: string | number | null | undefined,
      scale: number,
      precision: number,
    ) => {
      if (newValue === undefined)
        return;
      const current = showPlatform[field];
      let newDecimal: Prisma.Decimal | null = null;
      if (newValue !== null) {
        newDecimal = new Prisma.Decimal(newValue);
        if (!newDecimal.isFinite()) {
          throw HttpError.badRequest(`Invalid number for ${field}`);
        }
        newDecimal = newDecimal.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP);
        const maxMagnitude = new Prisma.Decimal(10).pow(precision - scale);
        if (newDecimal.abs().gte(maxMagnitude)) {
          throw HttpError.badRequest(`${field} value out of range`);
        }
      }

      const isChanged = current === null ? newDecimal !== null : (newDecimal === null || !newDecimal.equals(current as Prisma.Decimal));
      if (isChanged) {
        changes.push({
          field,
          old_value: current !== null ? (current as Prisma.Decimal).toString() : null,
          new_value: newDecimal !== null ? newDecimal.toString() : null,
        });
        metrics.push({ column, value: newDecimal });
      }
      if (isChanged || currentActualsSources[factKey] !== 'MANAGER') {
        nextActualsSources[factKey] = 'MANAGER';
        nextPerformanceTemplates[factKey] = 'MANAGER';
        if (!isChanged) {
          pinnedMetrics.push({
            field,
            value: newDecimal !== null ? newDecimal.toString() : null,
          });
        }
      }
    };

    checkMetric('gmv', 'gmv', 'show_platform_gmv', dto.gmv, 2, 12);
    checkMetric('ctr', 'ctr', 'show_platform_ctr', dto.ctr, 2, 5);
    checkMetric('cto', 'cto', 'show_platform_cto', dto.cto, 2, 5);

    if (dto.viewerCount !== undefined) {
      const current = showPlatform.viewerCount;
      const isChanged = current !== dto.viewerCount;
      if (isChanged) {
        changes.push({
          field: 'viewerCount',
          old_value: String(current),
          new_value: String(dto.viewerCount),
        });
        metrics.push({ column: 'viewer_count', value: dto.viewerCount });
      }
      if (isChanged || currentActualsSources.show_platform_view_count !== 'MANAGER') {
        nextActualsSources.show_platform_view_count = 'MANAGER';
        nextPerformanceTemplates.show_platform_view_count = 'MANAGER';
        if (!isChanged) {
          pinnedMetrics.push({
            field: 'viewerCount',
            value: String(dto.viewerCount),
          });
        }
      }
    }

    if (changes.length > 0 || Object.keys(nextActualsSources).length > 0) {
      const updateResult = await this.showPlatformRepository.updateCorrectedPerformanceMetrics({
        uid: showPlatformUid,
        showId: show.id,
        metrics,
        actualsSources: nextActualsSources,
        performanceTemplates: nextPerformanceTemplates,
      });
      if (updateResult === 'not_found') {
        throw HttpError.notFound('ShowPlatform', showPlatformUid);
      }

      await this.auditService.create({
        action: 'OVERRIDE',
        actorId: actor.id,
        reason: dto.reason,
        metadata: {
          corrected_metrics: changes,
          pinned_metrics: pinnedMetrics,
          platform_name: showPlatform.platform?.name ?? 'Unknown',
          show_name: show.name,
          actor_uid: actor.uid,
          show_uid: show.uid,
          show_platform_uid: showPlatform.uid,
        },
        targets: [
          { targetType: 'SHOW', targetId: show.id },
          { targetType: 'SHOW_PLATFORM', targetId: showPlatform.id },
        ],
      });
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }
}
