import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma, ShowPlatform } from '@prisma/client';

import type {
  CancelShowWithResolutionInput,
  RequestCancellationResolutionInput,
  ResolveShowCancellationInput,
} from '@eridu/api-types/shows';

import { CorrectShowPlatformPerformanceDto } from './schemas/correct-show-platform-performance.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import { PlatformRepository } from '@/models/platform/platform.repository';
import { ScheduleService } from '@/models/schedule/schedule.service';
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
import { UserService } from '@/models/user/user.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

type ShowCreateData = Omit<Parameters<ShowRepository['create']>[0], 'uid'>;
type ShowUpdateData = Parameters<ShowRepository['update']>[1];

@Injectable()
export class StudioShowManagementService {
  constructor(
    private readonly studioService: StudioService,
    private readonly studioRoomService: StudioRoomService,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly showRepository: ShowRepository,
    private readonly platformRepository: PlatformRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showOrchestrationService: ShowOrchestrationService,
    private readonly userService: UserService,
    private readonly showCancellationGateService: ShowCancellationGateService,
    private readonly showStatusService: ShowStatusService,
    private readonly taskService: TaskService,
    private readonly auditService: AuditService,
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

  async getCancellationStatus(studioUid: string, showUid: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    return this.showCancellationGateService.getCancellationStatus(show);
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
      ? await this.platformRepository.findByUids(uniquePlatformUids)
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
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const actor = await this.userService.getUserByExtId(actorExtId);
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
    const updateData: Prisma.ShowPlatformUpdateInput = {};
    const nextActualsSources: Record<string, string> = {};
    const nextPerformanceTemplates: Record<string, string> = {};

    const metadata = (showPlatform.metadata as Record<string, any> | null) ?? {};

    const checkMetric = (
      field: 'gmv' | 'ctr' | 'cto',
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
        updateData[field] = newDecimal;
        nextActualsSources[factKey] = 'MANAGER';
        nextPerformanceTemplates[factKey] = 'MANAGER';
      }
    };

    checkMetric('gmv', 'show_platform_gmv', dto.gmv, 2, 12);
    checkMetric('ctr', 'show_platform_ctr', dto.ctr, 2, 5);
    checkMetric('cto', 'show_platform_cto', dto.cto, 2, 5);

    if (dto.viewerCount !== undefined) {
      const current = showPlatform.viewerCount;
      const isChanged = current !== dto.viewerCount;
      if (isChanged) {
        changes.push({
          field: 'viewerCount',
          old_value: current !== null ? String(current) : null,
          new_value: dto.viewerCount !== null ? String(dto.viewerCount) : null,
        });
        updateData.viewerCount = dto.viewerCount ?? 0;
        nextActualsSources.show_platform_view_count = 'MANAGER';
        nextPerformanceTemplates.show_platform_view_count = 'MANAGER';
      }
    }

    if (changes.length > 0) {
      const mergedMetadata = {
        ...metadata,
        actuals_source: {
          ...(metadata.actuals_source as Record<string, string> ?? {}),
          ...nextActualsSources,
        },
        performance_templates: {
          ...(metadata.performance_templates as Record<string, string> ?? {}),
          ...nextPerformanceTemplates,
        },
      };

      updateData.metadata = mergedMetadata;

      await this.showPlatformRepository.update({ id: showPlatform.id }, updateData);

      await this.auditService.create({
        action: 'OVERRIDE',
        actorId: actor.id,
        reason: dto.reason,
        metadata: {
          corrected_metrics: changes,
          platform_name: showPlatform.platform?.name ?? 'Unknown',
          show_name: show.name,
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
