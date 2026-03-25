import { Injectable } from '@nestjs/common';
import { Prisma, StudioMembership } from '@prisma/client';

import { STUDIO_MEMBER_ERROR, STUDIO_ROLE } from '@eridu/api-types/memberships';

import type {
  AddStudioMemberPayload,
  CreateStudioMembershipPayload,
  UpdateStudioMemberPayload,
  UpdateStudioMembershipPayload,
} from './schemas/studio-membership.schema';
import { StudioMembershipRepository } from './studio-membership.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UserRepository } from '@/models/user/user.repository';
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
    private readonly userRepository: UserRepository,
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

  // ---------------------------------------------------------------------------
  // Studio Member Roster — /studios/:studioId/members
  // ---------------------------------------------------------------------------

  /**
   * List active memberships for a studio with embedded user info.
   */
  async listStudioMembers(studioUid: string) {
    return this.studioMembershipRepository.listStudioMembersWithUser(studioUid);
  }

  /**
   * Add a member to a studio by email lookup.
   * - If user does not exist → 404 USER_NOT_FOUND
   * - If active membership already exists → 409 MEMBER_ALREADY_EXISTS
   * - If soft-deleted membership exists → restore it with new role + rate
   */
  async addStudioMember(payload: AddStudioMemberPayload) {
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user) {
      throw HttpError.notFound(STUDIO_MEMBER_ERROR.USER_NOT_FOUND, payload.email);
    }

    // Check for existing membership (active or soft-deleted)
    const existing = await this.studioMembershipRepository.findByUserAndStudioIncludingDeleted(
      user.uid,
      payload.studioUid,
    );

    if (existing) {
      if (!existing.deletedAt) {
        // Active membership already exists
        throw HttpError.conflict(STUDIO_MEMBER_ERROR.MEMBER_ALREADY_EXISTS);
      }

      // Soft-deleted: restore with new role and rate
      return this.studioMembershipRepository.updateByUnique(
        { id: existing.id },
        {
          deletedAt: null,
          role: payload.role,
          baseHourlyRate: payload.baseHourlyRate.toFixed(2),
        },
        { user: true },
      );
    }

    const uid = this.generateUid();
    return this.studioMembershipRepository.createStudioMembership(
      {
        uid,
        user: { connect: { uid: user.uid } },
        studio: { connect: { uid: payload.studioUid } },
        role: payload.role,
        baseHourlyRate: payload.baseHourlyRate.toFixed(2),
        metadata: {},
      },
      { user: true },
    );
  }

  /**
   * Update a studio member's role and/or hourly rate.
   * Enforces self-demotion guard: ADMIN cannot demote their own membership.
   */
  async updateStudioMember(
    membershipUid: string,
    payload: UpdateStudioMemberPayload,
    actorMembershipUid?: string,
  ) {
    // Self-demotion guard: if actor is updating their own membership and demoting from ADMIN
    if (
      actorMembershipUid
      && actorMembershipUid === membershipUid
      && payload.role !== undefined
      && payload.role !== STUDIO_ROLE.ADMIN
    ) {
      throw HttpError.unprocessableEntity(STUDIO_MEMBER_ERROR.SELF_DEMOTION_NOT_ALLOWED);
    }

    const data: Prisma.StudioMembershipUpdateInput = {};
    if (payload.role !== undefined) {
      data.role = payload.role;
    }
    if (payload.baseHourlyRate !== undefined) {
      data.baseHourlyRate = payload.baseHourlyRate.toFixed(2);
    }

    return this.studioMembershipRepository.updateByUnique(
      { uid: membershipUid },
      data,
      { user: true },
    );
  }

  /**
   * Soft-deactivate a studio member.
   */
  async removeStudioMember(membershipUid: string): Promise<StudioMembership> {
    return this.studioMembershipRepository.softDeleteByUnique({ uid: membershipUid });
  }

  /**
   * Find a studio member by UID scoped to a specific studio.
   * Returns null if not found or not in the given studio.
   */
  async findStudioMemberByUidAndStudio(membershipUid: string, studioUid: string) {
    return this.studioMembershipRepository.findOne({
      uid: membershipUid,
      studio: { uid: studioUid },
      deletedAt: null,
    });
  }
}
