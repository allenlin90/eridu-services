import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import type {
  CreateStudioCreatorRosterPayload,
  OnboardCreatorPayload,
  StudioCreatorCatalogItemPayload,
  UpdateStudioCreatorRosterPayload,
} from './schemas/studio-creator.schema';
import { StudioCreatorRepository } from './studio-creator.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { CreatorService } from '@/models/creator/creator.service';
import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

export type StudioCreatorRosterWithUserPayload = {
  extId: string | null;
  name: string;
  email: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  banned: boolean;
  mcName: string;
  mcId: string;
  userId: string | null;
};

@Injectable()
export class StudioCreatorService extends BaseModelService {
  static readonly UID_PREFIX = 'smc';
  protected readonly uidPrefix = StudioCreatorService.UID_PREFIX;

  constructor(
    private readonly studioCreatorRepository: StudioCreatorRepository,
    private readonly creatorRepository: CreatorRepository,
    private readonly creatorService: CreatorService,
    private readonly userService: UserService,
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

  async listActiveRosterWithLinkedUsers(studioUid: string): Promise<StudioCreatorRosterWithUserPayload[]> {
    const roster = await this.studioCreatorRepository.findActiveRosterWithUser(studioUid);

    return roster.map(({ creator }) => {
      // A soft-deleted linked user must never surface through this roster
      // export (see the Engineering decision note on findActiveRosterWithUser
      // for why this can't be filtered at the query level).
      const user = creator.user && !creator.user.deletedAt ? creator.user : null;

      // Scoped to fields erify_api itself owns. role/emailVerified/banReason/
      // banExpires live in eridu_auth's own schema, which this service has no
      // access to — do not derive them from User.metadata guesswork.
      return {
        extId: user?.extId ?? null,
        name: user?.name ?? creator.name,
        email: user?.email ?? null,
        image: user?.profileUrl ?? null,
        createdAt: user?.createdAt ?? creator.createdAt,
        updatedAt: user?.updatedAt ?? creator.updatedAt,
        banned: user?.isBanned ?? false,
        mcName: creator.aliasName,
        mcId: creator.uid,
        userId: user?.uid ?? null,
      };
    });
  }

  listCatalog(
    studioUid: string,
    params: {
      search?: string;
      includeRostered?: boolean;
      excludeActiveRostered?: boolean;
      limit?: number;
    },
  ): Promise<StudioCreatorCatalogItemPayload[]> {
    return this.creatorRepository.findCatalogForStudio({
      studioUid,
      search: params.search,
      includeRostered: params.includeRostered,
      excludeActiveRostered: params.excludeActiveRostered,
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

  @Transactional()
  async onboardCreator(
    studioUid: string,
    payload: OnboardCreatorPayload,
  ): ReturnType<StudioCreatorRepository['createRosterEntry']> {
    this.validateCompensationDefaults({
      defaultRateType: payload.roster.defaultRateType ?? null,
      defaultCommissionRate: payload.roster.defaultCommissionRate ?? null,
    });

    const userId = payload.creator.userId ?? null;
    if (userId) {
      const user = await this.userService.getUserById(userId);
      if (!user) {
        throw HttpError.notFound('User', userId);
      }
    }

    const creator = await this.creatorService.createCreator({
      name: payload.creator.name,
      aliasName: payload.creator.aliasName,
      ...(payload.creator.type !== undefined && { type: payload.creator.type }),
      userId,
      metadata: payload.creator.metadata as Record<string, unknown> | undefined,
    });

    return this.studioCreatorRepository.createRosterEntry({
      uid: this.generateUid(),
      studioUid,
      creatorUid: creator.uid,
      defaultRate: this.toDecimalString(payload.roster.defaultRate),
      defaultRateType: payload.roster.defaultRateType,
      defaultCommissionRate: this.toDecimalString(payload.roster.defaultCommissionRate),
      metadata: payload.roster.metadata ?? {},
    });
  }

  // studioUid is unused here because authorization is enforced at the controller layer via
  // @StudioProtected([...creator roster managers]). The global user search is intentionally scoped
  // only by the studio-guarded endpoint, not by a per-studio user filter.
  searchOnboardingUsers(
    _studioUid: string,
    params: {
      search: string;
      limit: number;
    },
  ): ReturnType<UserService['searchUsersForCreatorOnboarding']> {
    return this.userService.searchUsersForCreatorOnboarding({
      search: params.search,
      limit: params.limit,
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
    defaultCommissionRate: string | null;
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
  ): string | null {
    if (payload.defaultRateType !== undefined) {
      if (payload.defaultRateType === CREATOR_COMPENSATION_TYPE.FIXED || payload.defaultRateType === null) {
        return null;
      }
    }

    if (payload.defaultCommissionRate !== undefined) {
      return payload.defaultCommissionRate;
    }

    return this.toNullableDecimalString(existingDefaultCommissionRate);
  }

  private toDecimalString(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return value;
  }

  private toNullableDecimalString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }
}
