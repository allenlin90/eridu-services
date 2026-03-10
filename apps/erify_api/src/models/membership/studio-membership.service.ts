import { Injectable } from '@nestjs/common';
import { StudioMembership } from '@prisma/client';

import type {
  CreateStudioMembershipPayload,
  UpdateStudioMembershipPayload,
} from './schemas/studio-membership.schema';
import { StudioMembershipRepository } from './studio-membership.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { withStudioMembershipTaskHelper } from '@/models/membership/studio-membership-helper.util';
import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

// Type aliases for better readability and type safety
type UserId = bigint;
type StudioId = bigint;
type StudioMembershipId = bigint;
type JsonPrimitive = string | number | boolean;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type StudioMembershipWithRelations = StudioMembership & {
  user: Record<string, unknown>;
  studio: Record<string, unknown>;
};

@Injectable()
export class StudioMembershipService extends BaseModelService {
  static readonly UID_PREFIX = 'smb';
  protected readonly uidPrefix = StudioMembershipService.UID_PREFIX;

  constructor(
    private readonly studioMembershipRepository: StudioMembershipRepository,
    private readonly userService: UserService,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createStudioMembership<T extends Parameters<StudioMembershipRepository['createStudioMembership']>[1]>(
    payload: CreateStudioMembershipPayload,
    include?: T,
  ): ReturnType<StudioMembershipRepository['createStudioMembership']> {
    const uid = this.generateUid();

    const data = {
      user: { connect: { uid: payload.userId } },
      studio: { connect: { uid: payload.studioId } },
      role: payload.role,
      ...(payload.baseHourlyRate !== undefined && {
        baseHourlyRate: payload.baseHourlyRate,
      }),
      metadata: payload.metadata ?? {},
    };

    return this.studioMembershipRepository.createStudioMembership(
      { ...data, uid },
      include,
    );
  }

  getStudioMembershipById<T extends Parameters<StudioMembershipRepository['findByUid']>[1]>(
    uid: string,
    include?: T,
  ): ReturnType<StudioMembershipRepository['findByUid']> {
    return this.studioMembershipRepository.findByUid(uid, include);
  }

  async findOne(
    ...args: Parameters<StudioMembershipRepository['findOne']>
  ): ReturnType<StudioMembershipRepository['findOne']> {
    return this.studioMembershipRepository.findOne(...args);
  }

  async findMany(
    ...args: Parameters<StudioMembershipRepository['findMany']>
  ): ReturnType<StudioMembershipRepository['findMany']> {
    return this.studioMembershipRepository.findMany(...args);
  }

  async listMembershipUserCatalog(
    studioUid: string,
    query: { search?: string; limit: number },
  ) {
    const eligibleUsers: Awaited<ReturnType<UserService['listUsers']>>['data'] = [];
    const seenUserIds = new Set<string>();
    const pageSize = query.limit;
    let page = 1;

    while (eligibleUsers.length < query.limit) {
      const { data } = await this.userService.listUsers({
        page,
        limit: pageSize,
        take: pageSize,
        skip: (page - 1) * pageSize,
        sort: 'asc',
        name: query.search,
        email: undefined,
        uid: undefined,
        extId: undefined,
        isSystemAdmin: undefined,
      });

      if (data.length === 0) {
        break;
      }

      const memberships = await this.studioMembershipRepository.findMany({
        where: {
          studio: { uid: studioUid, deletedAt: null },
          userId: { in: data.map((user) => user.id) },
        },
      });

      const memberUserIds = new Set(memberships.map((membership) => membership.userId.toString()));
      for (const user of data) {
        const userId = user.id.toString();
        if (memberUserIds.has(userId) || seenUserIds.has(userId)) {
          continue;
        }
        seenUserIds.add(userId);
        eligibleUsers.push(user);
        if (eligibleUsers.length === query.limit) {
          break;
        }
      }

      if (data.length < pageSize) {
        break;
      }
      page += 1;
    }

    return eligibleUsers;
  }

  async findByStudioAndUid(
    studioUid: string,
    membershipUid: string,
    include?: { user?: boolean; studio?: boolean },
  ): Promise<StudioMembershipWithRelations | null> {
    return this.studioMembershipRepository.findOne(
      {
        uid: membershipUid,
        studio: { uid: studioUid },
        deletedAt: null,
      },
      include,
    ) as Promise<StudioMembershipWithRelations | null>;
  }

  async getStudioMembershipsByStudio(
    studioId: StudioId,
  ): Promise<StudioMembership[]> {
    return this.studioMembershipRepository.findStudioMembershipsByStudio({
      studioId,
    });
  }

  async getUserStudioMemberships<T extends Parameters<StudioMembershipRepository['findUserStudioMemberships']>[1]>(
    userId: UserId,
    include?: T,
  ): ReturnType<StudioMembershipRepository['findUserStudioMemberships']> {
    return this.studioMembershipRepository.findUserStudioMemberships(
      userId,
      include,
    );
  }

  async getStudioMemberships<T extends Parameters<StudioMembershipRepository['findMany']>[0]['include']>(
    params: {
      skip: number;
      take: number;
    },
    include?: T,
  ): ReturnType<StudioMembershipRepository['findMany']> {
    return this.studioMembershipRepository.findMany({
      skip: params.skip,
      take: params.take,
      include,
    });
  }

  async countStudioMemberships(
    where: Parameters<StudioMembershipRepository['count']>[0],
  ): Promise<number> {
    return this.studioMembershipRepository.count(where);
  }

  async listStudioMemberships<T extends Parameters<StudioMembershipRepository['listStudioMemberships']>[1]>(
    params: Parameters<StudioMembershipRepository['listStudioMemberships']>[0],
    include?: T,
  ): ReturnType<StudioMembershipRepository['listStudioMemberships']> {
    return this.studioMembershipRepository.listStudioMemberships(params, include);
  }

  async isUserAdmin(userId: UserId): Promise<boolean> {
    const memberships = await this.studioMembershipRepository.findMany({
      where: {
        userId,
        role: 'admin',
        deletedAt: null,
      },
    });

    return memberships.length > 0;
  }

  /**
   * Find admin studio membership for user by ext_id
   * Returns the first admin membership found with optional relations included
   * This is optimized to query in a single database call by joining User and StudioMembership
   *
   * Use this method when you need the membership data, not just a boolean check.
   * For guard usage, check if the result is not null.
   *
   * @param extId - User's external ID (from JWT payload)
   * @param include - Optional Prisma include to load relations (e.g., { user: true, studio: true })
   * @returns StudioMembership with optional relations, or null if user is not admin
   */
  async findAdminMembershipByExtId<T extends Parameters<StudioMembershipRepository['findAdminMembershipByExtId']>[1]>(
    extId: string,
    include?: T,
  ): ReturnType<StudioMembershipRepository['findAdminMembershipByExtId']> {
    return this.studioMembershipRepository.findAdminMembershipByExtId(
      extId,
      include,
    );
  }

  async isUserStudioAdmin(
    userId: UserId,
    studioId: StudioId,
  ): Promise<boolean> {
    const membership = await this.studioMembershipRepository.findOne({
      userId,
      studioId,
      role: 'admin',
      deletedAt: null,
    });

    return membership !== null;
  }

  async hasUserMembershipInStudio(
    userUid: string,
    studioId: StudioId,
  ): Promise<boolean> {
    const membership = await this.studioMembershipRepository.findOne({
      user: { uid: userUid },
      studioId,
      deletedAt: null,
    });

    return membership !== null;
  }

  async updateStudioMembership<T extends Parameters<StudioMembershipRepository['updateByUnique']>[2]>(
    uid: string,
    payload: UpdateStudioMembershipPayload,
    include?: T,
  ): ReturnType<StudioMembershipRepository['updateByUnique']> {
    const data: Record<string, any> = {};

    if (payload.role !== undefined)
      data.role = payload.role;
    if (payload.baseHourlyRate !== undefined)
      data.baseHourlyRate = payload.baseHourlyRate;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.userId !== undefined) {
      data.user = { connect: { uid: payload.userId } };
    }

    if (payload.studioId !== undefined) {
      data.studio = { connect: { uid: payload.studioId } };
    }

    return this.studioMembershipRepository.updateByUnique(
      { uid },
      data,
      include,
    );
  }

  async deleteStudioMembership(uid: string): Promise<StudioMembership> {
    return this.studioMembershipRepository.softDeleteByUnique({ uid });
  }

  async restoreStudioMembership(
    id: StudioMembershipId,
  ): Promise<StudioMembership> {
    return this.studioMembershipRepository.restoreByUnique({ id });
  }

  async toggleTaskHelperStatus(
    studioUid: string,
    membershipUid: string,
    isHelper: boolean,
  ): Promise<StudioMembershipWithRelations | null> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const current = await this.studioMembershipRepository.findOne(
        {
          uid: membershipUid,
          studio: { uid: studioUid },
          deletedAt: null,
        },
        { user: true, studio: true },
      ) as StudioMembershipWithRelations | null;

      if (!current) {
        return null;
      }

      const metadata = withStudioMembershipTaskHelper(
        current.metadata as Record<string, unknown> | null | undefined,
        isHelper,
      ) as JsonValue;

      const updatedCount = await this.studioMembershipRepository.updateMetadataIfUnchanged({
        uid: membershipUid,
        studioUid,
        expectedUpdatedAt: current.updatedAt,
        metadata,
      });

      if (updatedCount === 1) {
        const updated = await this.studioMembershipRepository.findByUid(
          membershipUid,
          { user: true, studio: true },
        );
        return updated as StudioMembershipWithRelations | null;
      }
    }

    throw HttpError.conflict(
      `Studio membership ${membershipUid} was updated concurrently. Please retry.`,
    );
  }
}
