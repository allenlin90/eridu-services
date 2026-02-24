import { Injectable } from '@nestjs/common';
import { StudioMembership } from '@prisma/client';

import type {
  CreateStudioMembershipPayload,
  UpdateStudioMembershipPayload,
} from './schemas/studio-membership.schema';
import { StudioMembershipRepository } from './studio-membership.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

// Type aliases for better readability and type safety
type UserId = bigint;
type StudioId = bigint;
type StudioMembershipId = bigint;

@Injectable()
export class StudioMembershipService extends BaseModelService {
  static readonly UID_PREFIX = 'smb';
  protected readonly uidPrefix = StudioMembershipService.UID_PREFIX;

  constructor(
    private readonly studioMembershipRepository: StudioMembershipRepository,
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
}
