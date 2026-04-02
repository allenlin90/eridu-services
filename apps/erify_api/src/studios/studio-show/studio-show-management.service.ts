import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Prisma } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';
import { PlatformRepository } from '@/models/platform/platform.repository';
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
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

@Injectable()
export class StudioShowManagementService {
  constructor(
    private readonly studioService: StudioService,
    private readonly studioRoomService: StudioRoomService,
    private readonly showService: ShowService,
    private readonly showRepository: ShowRepository,
    private readonly platformRepository: PlatformRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showOrchestrationService: ShowOrchestrationService,
  ) {}

  @Transactional()
  async createShow(studioUid: string, dto: CreateStudioShowDto) {
    await this.studioService.getStudioById(studioUid);
    await this.ensureStudioRoomBelongsToStudio(studioUid, dto.studioRoomId);

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
    this.ensureValidTimeRange(existingShow.startTime, existingShow.endTime, dto);

    await this.showRepository.update({ uid: showUid }, this.buildUpdatePayload(dto));

    if (dto.platformIds !== undefined) {
      await this.replaceShowPlatforms(existingShow.id, dto.platformIds);
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
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
    const show = await this.showService.getShowById(showUid, studioShowDetailInclude);
    const studio = await this.studioService.getStudioById(studioUid);

    if (show.studioId !== studio.id) {
      throw HttpError.forbidden('Show does not belong to this studio');
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
  ): Omit<Prisma.ShowCreateInput, 'uid'> {
    return {
      externalId: dto.externalId ?? null,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      metadata: dto.metadata ?? {},
      client: { connect: { uid: dto.clientId } },
      studio: { connect: { uid: studioUid } },
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
  ): Prisma.ShowUpdateInput {
    return {
      externalId: dto.externalId ?? null,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      metadata: dto.metadata ?? {},
      client: { connect: { uid: dto.clientId } },
      studio: { connect: { uid: studioUid } },
      studioRoom: dto.studioRoomId
        ? { connect: { uid: dto.studioRoomId } }
        : { disconnect: true },
      showType: { connect: { uid: dto.showTypeId } },
      showStatus: { connect: { uid: dto.showStatusId } },
      showStandard: { connect: { uid: dto.showStandardId } },
      deletedAt: null,
    };
  }

  private buildUpdatePayload(dto: UpdateStudioShowDto): Prisma.ShowUpdateInput {
    const payload: Prisma.ShowUpdateInput = {};

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
    const existingAssignments = await this.showPlatformRepository.findMany({
      where: { showId },
    });
    const retainedPlatformIds = new Set<bigint>();

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
        await this.showPlatformRepository.restoreAndUpdateAssignment(existingAssignment.id, {
          liveStreamLink: existingAssignment.liveStreamLink,
          platformShowId: existingAssignment.platformShowId,
          viewerCount: existingAssignment.viewerCount,
          metadata: (existingAssignment.metadata as object) ?? {},
        });
        continue;
      }

      await this.showPlatformRepository.createAssignment({
        uid: this.showPlatformService.generateShowPlatformUid(),
        showId,
        platformId,
        metadata: {},
      });
    }

    const assignmentsToDelete = existingAssignments.filter(
      (assignment) => assignment.deletedAt === null && !retainedPlatformIds.has(assignment.platformId),
    );

    for (const assignment of assignmentsToDelete) {
      await this.showPlatformRepository.softDelete({ id: assignment.id });
    }
  }
}
