import { Injectable } from '@nestjs/common';
import { Client, Membership, Platform, Prisma, Studio } from '@prisma/client';

import { ClientService } from '../client/client.service';
import { HttpError } from '../common/errors/http-error.util';
import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { PlatformService } from '../platform/platform.service';
import { StudioService } from '../studio/studio.service';
import { UtilityService } from '../utility/utility.service';
import { MembershipRepository } from './membership.repository';
import { GroupType } from './schemas/membership.schema';

// Type aliases for better readability and type safety
type UserId = Prisma.UserWhereUniqueInput['id'];
type GroupId = bigint; // Direct BigInt type for group IDs
type MembershipId = Prisma.MembershipWhereUniqueInput['id'];

type MembershipWithIncludes<T extends Prisma.MembershipInclude> =
  Prisma.MembershipGetPayload<{
    include: T;
  }>;

@Injectable()
export class MembershipService {
  static readonly UID_PREFIX = 'mbr';

  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly utilityService: UtilityService,
    private readonly clientService: ClientService,
    private readonly platformService: PlatformService,
    private readonly studioService: StudioService,
  ) {}

  generateMembershipUid(): string {
    return this.utilityService.generateBrandedId(MembershipService.UID_PREFIX);
  }

  private async createMembership<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    data: Prisma.MembershipCreateInput,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T>> {
    try {
      const membership = await this.membershipRepository.createMembership(
        data,
        include,
      );

      // If include is provided and includes group, fetch the polymorphic group
      if (include && 'group' in include) {
        const group = await this.getGroupByType(
          membership.groupId,
          membership.groupType as GroupType,
        );

        if (!group) {
          throw HttpError.notFound('Group not found');
        }
        return { ...membership, group } as MembershipWithIncludes<T>;
      }

      return membership;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('User is already a member of this group');
      }
      throw error;
    }
  }

  /**
   * Creates a membership with validation to ensure a user can only join a specific group once.
   * Users can join multiple different groups, but cannot join the same group twice.
   *
   * @param userId - The user ID (Prisma BigInt)
   * @param groupId - The group ID (Prisma BigInt)
   * @param groupType - The type of group (client, platform, studio)
   * @param role - The role in the group
   * @param metadata - Optional metadata
   * @param include - Optional Prisma include for related data
   * @returns The created membership
   * @throws HttpError.conflict if user is already a member of this group
   */
  async createMembershipWithValidation<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    userId: UserId,
    groupId: GroupId,
    groupType: string,
    role: string,
    metadata?: Record<string, any>,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T>> {
    // Check if user is already a member of this specific group
    await this.validateMembershipNotExists(userId, groupId, groupType);

    const uid = this.utilityService.generateBrandedId(
      MembershipService.UID_PREFIX,
    );
    const data: Prisma.MembershipCreateInput = {
      uid,
      user: { connect: { id: userId } },
      groupId: groupId,
      groupType,
      role,
      metadata: metadata || {},
    };

    return this.createMembership(data, include);
  }

  /**
   * Validates that a user is not already a member of a specific group.
   * This enforces the business rule that a user can only join a group once.
   *
   * @param userId - The user ID (Prisma BigInt)
   * @param groupId - The group ID (Prisma BigInt)
   * @param groupType - The type of group
   * @throws HttpError.conflict if user is already a member of this group
   */
  async validateMembershipNotExists(
    userId: UserId,
    groupId: GroupId,
    groupType: string,
  ): Promise<void> {
    const existingMembership = await this.membershipRepository.findOne({
      userId: userId,
      groupId: groupId,
      groupType,
    });

    if (existingMembership) {
      throw HttpError.conflict(
        `User is already a member of this ${groupType} group`,
      );
    }
  }

  async getMembershipsByGroup(
    groupType: string,
    groupId: GroupId,
  ): Promise<Membership[]> {
    const memberships = await this.membershipRepository.findMembershipsByGroup({
      groupType,
      groupId,
    });

    return memberships;
  }

  async getUserMemberships(userId: UserId): Promise<Membership[]> {
    const memberships =
      await this.membershipRepository.findUserMemberships(userId);

    return memberships;
  }

  /**
   * Updates a membership with validation to ensure a user can only join a specific group once.
   * This method validates that updating the membership won't violate the unique constraint
   * that prevents a user from joining the same group twice.
   *
   * @param where - The unique identifier for the membership to update
   * @param data - The data to update
   * @returns The updated membership
   * @throws HttpError.conflict if the update would result in duplicate membership
   */
  async updateMembership<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    where: Prisma.MembershipWhereUniqueInput,
    data: Prisma.MembershipUpdateInput,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T>> {
    try {
      // If the update includes user, groupId, or groupType changes, validate uniqueness
      if (data.user || data.groupId || data.groupType) {
        // Get the current membership to extract current values
        let currentMembership: Membership | null = null;

        if (where.uid) {
          currentMembership = await this.membershipRepository.findByUid(
            where.uid,
          );
        } else if (where.id) {
          currentMembership = await this.membershipRepository.findOne({
            id: where.id,
          });
        }

        if (!currentMembership) {
          throw HttpError.notFound('Membership not found');
        }

        if (data.user || data.groupId) {
          const finalUserId = (data.user as UserId) || currentMembership.userId;
          const finalGroupId =
            (data.groupId as GroupId) || currentMembership.groupId;
          const finalGroupType =
            (data.groupType as string) || currentMembership.groupType;

          // Reuse existing validation method, excluding the current membership
          await this.validateMembershipNotExists(
            finalUserId,
            finalGroupId,
            finalGroupType,
          );
        }
      }

      return this.membershipRepository.updateByUnique(where, data, include);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('User is already a member of this group');
      }
      throw error;
    }
  }

  async deleteMembership(id: MembershipId): Promise<Membership> {
    return this.membershipRepository.softDeleteByUnique({ id });
  }

  async restoreMembership(id: MembershipId): Promise<Membership> {
    return this.membershipRepository.restoreByUnique({ id });
  }

  async getMembershipById<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T> | null> {
    const membership = await this.membershipRepository.findByUid(uid, include);

    return membership;
  }

  async getMemberships<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    params: {
      skip: number;
      take: number;
    },
    include?: T,
  ): Promise<Membership[] | MembershipWithIncludes<T>[]> {
    return this.membershipRepository.findMany({
      skip: params.skip,
      take: params.take,
      include,
    });
  }

  /**
   * Gets memberships with polymorphic groups included
   * This method automatically fetches the appropriate group data based on groupType
   */
  async getMembershipsWithPolymorphicGroups(params: {
    skip: number;
    take: number;
  }): Promise<
    Array<Membership & { group: { id: bigint; uid: string; name: string } }>
  > {
    const memberships = await this.membershipRepository.findMany({
      skip: params.skip,
      take: params.take,
    });

    // Fetch polymorphic groups for each membership
    const membershipsWithGroups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await this.getGroupByType(
          membership.groupId,
          membership.groupType as GroupType,
        );

        if (!group) {
          throw HttpError.notFound(
            `Group not found for membership ${membership.uid}`,
          );
        }

        return { ...membership, group };
      }),
    );

    return membershipsWithGroups;
  }

  async countMemberships(
    where: Prisma.MembershipWhereInput = {},
  ): Promise<number> {
    return this.membershipRepository.count(where);
  }

  async updateMembershipByUid(
    uid: string,
    data: Prisma.MembershipUpdateInput,
  ): Promise<Membership> {
    return this.membershipRepository.updateByUnique({ uid }, data);
  }

  async deleteMembershipByUid(uid: string): Promise<Membership> {
    return this.membershipRepository.softDeleteByUnique({ uid });
  }

  private async getGroupByType(
    id: bigint,
    groupType: GroupType,
  ): Promise<Client | Platform | Studio | null> {
    switch (groupType) {
      case 'client':
        return this.clientService.findClientById(id);
      case 'platform':
        return this.platformService.findPlatformById(id);
      case 'studio':
        return this.studioService.findStudioById(id);
      default:
        throw HttpError.badRequest('invalid group type');
    }
  }
}
