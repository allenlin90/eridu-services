import { Injectable } from '@nestjs/common';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import type {
  CreateStudioCreatorRosterPayload,
  StudioCreatorCatalogItemPayload,
  UpdateStudioCreatorRosterPayload,
} from './schemas/studio-creator.schema';
import { StudioCreatorRepository } from './studio-creator.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { CreatorRepository } from '@/models/creator/creator.repository';
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

  listRoster(
    studioUid: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      isActive?: boolean;
      defaultRateType?: string | null;
    },
  ): ReturnType<StudioCreatorRepository['findByStudioUidPaginated']> {
    return this.studioCreatorRepository.findByStudioUidPaginated(studioUid, {
      ...params,
      isActive: params.isActive ?? true,
    });
  }

  listCatalog(
    studioUid: string,
    params: {
      search?: string;
      includeRostered?: boolean;
      limit?: number;
    },
  ): Promise<StudioCreatorCatalogItemPayload[]> {
    return this.creatorRepository.findCatalogForStudio({
      studioUid,
      search: params.search,
      includeRostered: params.includeRostered,
      limit: params.limit,
    });
  }

  listAvailable(
    studioUid: string,
    params: {
      dateFrom: Date;
      dateTo: Date;
      search?: string;
      limit?: number;
    },
  ): ReturnType<CreatorRepository['findAvailableForStudioWindow']> {
    return this.creatorRepository.findAvailableForStudioWindow({
      studioUid,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      search: params.search,
      limit: params.limit,
    });
  }

  findRosterEntry(
    studioUid: string,
    creatorUid: string,
  ): ReturnType<StudioCreatorRepository['findByStudioUidAndCreatorUid']> {
    return this.studioCreatorRepository.findByStudioUidAndCreatorUid(studioUid, creatorUid);
  }

  async addCreatorToRoster(
    studioUid: string,
    payload: CreateStudioCreatorRosterPayload,
  ): ReturnType<StudioCreatorRepository['createRosterEntry']> {
    const creator = await this.creatorRepository.findByUid(payload.creatorId);
    if (!creator) {
      throw HttpError.notFound(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_FOUND, payload.creatorId);
    }

    this.validateCompensationDefaults({
      defaultRateType: payload.defaultRateType ?? null,
      defaultCommissionRate: payload.defaultCommissionRate ?? null,
    });

    const existing = await this.studioCreatorRepository.findByStudioUidAndCreatorUid(
      studioUid,
      payload.creatorId,
    );

    const normalized = {
      defaultRate: this.toDecimalString(payload.defaultRate),
      defaultRateType: payload.defaultRateType,
      defaultCommissionRate: this.toDecimalString(payload.defaultCommissionRate),
      metadata: payload.metadata ?? (existing?.metadata as Record<string, unknown> | undefined) ?? {},
    };

    if (existing) {
      if (existing.isActive) {
        throw HttpError.conflict(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_ALREADY_IN_ROSTER);
      }

      return this.studioCreatorRepository.reactivateRosterEntry({
        uid: existing.uid,
        ...normalized,
      });
    }

    return this.studioCreatorRepository.createRosterEntry({
      uid: this.generateUid(),
      studioUid,
      creatorUid: payload.creatorId,
      ...normalized,
    });
  }

  async updateRosterEntry(
    studioUid: string,
    creatorUid: string,
    payload: UpdateStudioCreatorRosterPayload,
  ): ReturnType<StudioCreatorRepository['updateWithVersionCheck']> {
    const existing = await this.studioCreatorRepository.findByStudioUidAndCreatorUid(
      studioUid,
      creatorUid,
    );

    if (!existing) {
      throw HttpError.notFound('Studio creator', creatorUid);
    }

    const nextDefaultRateType = payload.defaultRateType !== undefined
      ? payload.defaultRateType
      : existing.defaultRateType;
    const nextDefaultCommissionRate = this.resolveNextCommissionRate(existing.defaultCommissionRate, payload);

    this.validateCompensationDefaults({
      defaultRateType: nextDefaultRateType ?? null,
      defaultCommissionRate: nextDefaultCommissionRate,
    });

    const updatePayload = {
      defaultRate: payload.defaultRate !== undefined
        ? this.toDecimalString(payload.defaultRate)
        : undefined,
      defaultRateType: payload.defaultRateType,
      defaultCommissionRate: payload.defaultRateType !== undefined
        && (payload.defaultRateType === CREATOR_COMPENSATION_TYPE.FIXED || payload.defaultRateType === null)
        && payload.defaultCommissionRate === undefined
        ? null
        : payload.defaultCommissionRate !== undefined
          ? this.toDecimalString(payload.defaultCommissionRate)
          : undefined,
      isActive: payload.isActive,
      metadata: payload.metadata,
    };

    try {
      return await this.studioCreatorRepository.updateWithVersionCheck(
        studioUid,
        creatorUid,
        payload.version,
        updatePayload,
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(STUDIO_CREATOR_ROSTER_ERROR.VERSION_CONFLICT);
      }
      throw error;
    }
  }

  private validateCompensationDefaults(payload: {
    defaultRateType: string | null;
    defaultCommissionRate: number | null;
  }) {
    if (
      payload.defaultRateType === CREATOR_COMPENSATION_TYPE.FIXED
      && payload.defaultCommissionRate !== null
    ) {
      throw HttpError.badRequest('default_commission_rate must be null when default_rate_type is FIXED');
    }

    if (
      (payload.defaultRateType === CREATOR_COMPENSATION_TYPE.COMMISSION
        || payload.defaultRateType === CREATOR_COMPENSATION_TYPE.HYBRID)
      && payload.defaultCommissionRate === null
    ) {
      throw HttpError.badRequest(
        'default_commission_rate is required when default_rate_type is COMMISSION or HYBRID',
      );
    }

    if (payload.defaultRateType === null && payload.defaultCommissionRate !== null) {
      throw HttpError.badRequest('default_commission_rate must be null when default_rate_type is null');
    }
  }

  private resolveNextCommissionRate(
    existingDefaultCommissionRate: unknown,
    payload: UpdateStudioCreatorRosterPayload,
  ): number | null {
    if (payload.defaultRateType !== undefined) {
      if (payload.defaultRateType === CREATOR_COMPENSATION_TYPE.FIXED || payload.defaultRateType === null) {
        return null;
      }
    }

    if (payload.defaultCommissionRate !== undefined) {
      return payload.defaultCommissionRate;
    }

    return this.toNullableNumber(existingDefaultCommissionRate);
  }

  private toDecimalString(value: number | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return value.toFixed(2);
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return Number(value);
  }
}
