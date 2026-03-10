import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';
import type { CreateStudioCreatorRosterPayload, UpdateStudioCreatorRosterPayload } from '@/studios/studio-creator/schemas/studio-creator-roster.schema';
import type { ListStudioCreatorRosterQueryPayload } from '@/studios/studio-creator/schemas/studio-creator-roster-list.schema';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class StudioCreatorService extends BaseModelService {
  static readonly UID_PREFIX = 'smc';
  protected readonly uidPrefix = StudioCreatorService.UID_PREFIX;

  constructor(
    private readonly studioCreatorRepository: StudioCreatorRepository,
    private readonly creatorRepository: CreatorRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async listRoster(studioUid: string, query: ListStudioCreatorRosterQueryPayload) {
    return this.studioCreatorRepository.findByStudioUidPaginated(studioUid, {
      skip: query.skip,
      take: query.take,
      search: query.search,
      isActive: query.isActive,
      defaultRateType: query.defaultRateType,
    });
  }

  async listCatalog(
    studioUid: string,
    params: { search?: string; includeRostered?: boolean; limit?: number },
  ) {
    return this.creatorRepository.findCatalogForStudio({
      studioUid,
      search: params.search,
      includeRostered: params.includeRostered,
      limit: params.limit,
    });
  }

  async addToRoster(studioUid: string, payload: CreateStudioCreatorRosterPayload) {
    const creator = await this.creatorRepository.findByUid(payload.creatorId);
    if (!creator) {
      throw HttpError.notFound('Creator not found');
    }

    const existing = await this.studioCreatorRepository.findOneByStudioAndCreatorUid(
      studioUid,
      payload.creatorId,
      true,
    );

    if (existing && existing.deletedAt === null) {
      throw HttpError.badRequest('Creator is already in this studio roster');
    }

    if (existing) {
      return this.studioCreatorRepository.updateById(existing.id, {
        ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
        ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
        ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
        isActive: payload.isActive ?? true,
        metadata: payload.metadata ?? {},
        deletedAt: null,
      });
    }

    const uid = this.generateUid();
    return this.studioCreatorRepository.createByUids(uid, studioUid, payload.creatorId, {
      defaultRate: payload.defaultRate,
      defaultRateType: payload.defaultRateType,
      defaultCommissionRate: payload.defaultCommissionRate,
      isActive: payload.isActive ?? true,
      metadata: payload.metadata,
    });
  }

  async updateRoster(
    studioUid: string,
    creatorUid: string,
    payload: UpdateStudioCreatorRosterPayload,
  ) {
    const existing = await this.studioCreatorRepository.findOneByStudioAndCreatorUid(
      studioUid,
      creatorUid,
      false,
    );
    if (!existing) {
      throw HttpError.notFound('Studio roster member not found');
    }

    const data: Record<string, unknown> = {};
    if (payload.defaultRate !== undefined)
      data.defaultRate = payload.defaultRate;
    if (payload.defaultRateType !== undefined)
      data.defaultRateType = payload.defaultRateType;
    if (payload.defaultCommissionRate !== undefined)
      data.defaultCommissionRate = payload.defaultCommissionRate;
    if (payload.isActive !== undefined)
      data.isActive = payload.isActive;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    try {
      return await this.studioCreatorRepository.updateByIdWithVersionCheck(
        existing.id,
        payload.version,
        data,
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          `Studio creator roster ${existing.uid} has been updated by another user. Please refresh and retry.`,
        );
      }
      throw error;
    }
  }

  async removeFromRoster(studioUid: string, creatorUid: string) {
    const existing = await this.studioCreatorRepository.findOneByStudioAndCreatorUid(
      studioUid,
      creatorUid,
      false,
    );
    if (!existing) {
      throw HttpError.notFound('Studio roster member not found');
    }

    await this.studioCreatorRepository.softDeleteById(existing.id);
    return existing;
  }
}

export { StudioCreatorService as StudioMcService };
