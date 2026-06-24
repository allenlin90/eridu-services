import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Prisma } from '@prisma/client';

import {
  CancelStudioShowDto,
  ResolveStudioShowCancellationDto,
  toStudioShowStateGateDto,
} from './schemas/studio-show-cancellation.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
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
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { getGateConfig, isGateKind } from '@/show-orchestration/show-state-gate.config';
import { ShowStateGateService } from '@/show-orchestration/show-state-gate.service';

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
    private readonly showStateGateService: ShowStateGateService,
    private readonly taskService: TaskService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly userService: UserService,
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

    await this.showRepository.update({ uid: showUid }, this.buildUpdatePayload(dto));

    if (dto.platformIds !== undefined) {
      await this.replaceShowPlatforms(existingShow.id, dto.platformIds);
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  async getShowDetail(studioUid: string, showUid: string) {
    return this.findStudioShowOrThrow(studioUid, showUid);
  }

  @Transactional()
  async cancelShowWithResolution(
    studioUid: string,
    showUid: string,
    dto: CancelStudioShowDto,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const currentStatus = show.showStatus?.systemKey ?? null;
    if (
      currentStatus === null
      || ['DRAFT', 'CANCELLED_PENDING_RESOLUTION', 'CANCELLED', 'COMPLETED'].includes(
        currentStatus,
      )
    ) {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_ALLOWED');
    }

    const [ownerMembership, actor] = await Promise.all([
      this.studioMembershipService.findStudioMemberByUidAndStudio(
        dto.resolutionOwnerMembershipId,
        studioUid,
      ),
      this.userService.getUserByExtId(actorExtId),
    ]);
    if (!ownerMembership) {
      throw HttpError.badRequest('RESOLUTION_OWNER_NOT_FOUND');
    }
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    await this.showStateGateService.openGate(show.id, 'show_cancellation', {
      owner: {
        id: ownerMembership.userId,
        uid: ownerMembership.user.uid,
      },
      fromStatusSystemKey: currentStatus,
      dueDate: dto.followUpDueAt ? new Date(dto.followUpDueAt) : null,
      content: {
        reason_category: dto.reasonCategory,
        reason_note: dto.reasonNote,
        follow_up_notes: dto.followUpNotes ?? null,
      },
      createdBy: { id: actor.id, uid: actor.uid },
      studioId: show.studioId ?? null,
    });

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async resolveShowCancellation(
    studioUid: string,
    showUid: string,
    dto: ResolveStudioShowCancellationDto,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_PENDING');
    }

    const [gateTask, actor] = await Promise.all([
      this.taskService.findOpenStateGateForShow(show.id),
      this.userService.getUserByExtId(actorExtId),
    ]);
    if (!gateTask) {
      throw HttpError.notFound('ShowStateGate', showUid);
    }
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    await this.showStateGateService.resolveGate(
      gateTask.uid,
      dto.outcome,
      dto.resolutionNotes,
      { id: actor.id, uid: actor.uid },
    );

    const gateMetadata
      = (gateTask.metadata as Record<string, unknown> | null) ?? {};
    if (
      gateMetadata.gate_kind === 'schedule_publish_removal'
      && dto.outcome === 'RESTORE_PREVIOUS'
    ) {
      await this.showRepository.update(
        { id: show.id },
        {
          metadata: {
            ...((show.metadata as Record<string, unknown> | null) ?? {}),
            schedule_resume_notice: {
              resumed_by: actor.uid,
              resumed_at: new Date().toISOString(),
              gate_task_uid: gateTask.uid,
            },
          } as Prisma.InputJsonValue,
        },
      );
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  async getOpenStateGateForShow(studioUid: string, showUid: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const gateTask = await this.taskService.findOpenStateGateForShow(show.id);
    const rawGateKind = (gateTask?.metadata as Record<string, unknown> | undefined)
      ?.gate_kind;
    const allowedOutcomes = isGateKind(rawGateKind)
      ? getGateConfig(rawGateKind).allowedOutcomes
      : [];

    return toStudioShowStateGateDto(gateTask, allowedOutcomes);
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
}
