import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { McRepository } from '@/models/mc/mc.repository';
import { StudioMcRepository } from '@/models/studio-mc/studio-mc.repository';
import type { CreateStudioMcRosterPayload, UpdateStudioMcRosterPayload } from '@/studios/studio-mc/schemas/studio-mc-roster.schema';
import type { ListStudioMcRosterQueryPayload } from '@/studios/studio-mc/schemas/studio-mc-roster-list.schema';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class StudioMcService extends BaseModelService {
  static readonly UID_PREFIX = 'smc';
  protected readonly uidPrefix = StudioMcService.UID_PREFIX;

  constructor(
    private readonly studioMcRepository: StudioMcRepository,
    private readonly mcRepository: McRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async listRoster(studioUid: string, query: ListStudioMcRosterQueryPayload) {
    return this.studioMcRepository.findByStudioUidPaginated(studioUid, {
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
    return this.mcRepository.findCatalogForStudio({
      studioUid,
      search: params.search,
      includeRostered: params.includeRostered,
      limit: params.limit,
    });
  }

  async addToRoster(studioUid: string, payload: CreateStudioMcRosterPayload) {
    const mc = await this.mcRepository.findByUid(payload.mcId);
    if (!mc) {
      throw HttpError.notFound('MC not found');
    }

    const existing = await this.studioMcRepository.findOneByStudioAndMcUid(
      studioUid,
      payload.mcId,
      true,
    );

    if (existing && existing.deletedAt === null) {
      throw HttpError.badRequest('MC is already in this studio roster');
    }

    if (existing) {
      return this.studioMcRepository.updateById(existing.id, {
        ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
        ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
        ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
        isActive: payload.isActive ?? true,
        metadata: payload.metadata ?? {},
        deletedAt: null,
      });
    }

    const uid = this.generateUid();
    return this.studioMcRepository.createByUids(uid, studioUid, payload.mcId, {
      defaultRate: payload.defaultRate,
      defaultRateType: payload.defaultRateType,
      defaultCommissionRate: payload.defaultCommissionRate,
      isActive: payload.isActive ?? true,
      metadata: payload.metadata,
    });
  }

  async updateRoster(
    studioUid: string,
    mcUid: string,
    payload: UpdateStudioMcRosterPayload,
  ) {
    const existing = await this.studioMcRepository.findOneByStudioAndMcUid(
      studioUid,
      mcUid,
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

    return this.studioMcRepository.updateById(existing.id, data);
  }

  async removeFromRoster(studioUid: string, mcUid: string) {
    const existing = await this.studioMcRepository.findOneByStudioAndMcUid(
      studioUid,
      mcUid,
      false,
    );
    if (!existing) {
      throw HttpError.notFound('Studio roster member not found');
    }

    await this.studioMcRepository.softDeleteById(existing.id);
    return existing;
  }
}
