import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Membership, Prisma } from '@prisma/client';

import {
  GROUP_TYPE,
  GROUP_TYPE_SET,
  GroupType,
  ROLE,
  Role,
  ROLE_SET,
  VALIDATION_MESSAGES,
} from './membership.constants';
import { MembershipRepository } from './membership.repository';

@Injectable()
export class MembershipService {
  // Export constants for external use
  static readonly GROUP_TYPE = GROUP_TYPE;
  static readonly ROLE = ROLE;

  private static readonly GROUP_TYPE_SET = GROUP_TYPE_SET;
  private static readonly ROLE_SET = ROLE_SET;

  constructor(private readonly membershipRepository: MembershipRepository) {}

  /**
   * Creates a new membership with validation
   * @throws BadRequestException if validation fails
   */
  async createMembership(
    data: Prisma.MembershipCreateInput,
  ): Promise<Membership> {
    this.validateMembershipData(data);
    return this.membershipRepository.createMembership(data);
  }

  /**
   * Retrieves memberships for a specific group
   * @throws BadRequestException if group type is invalid
   */
  async getMembershipsByGroup(
    groupType: string,
    groupId: number,
  ): Promise<Membership[]> {
    if (!MembershipService.GROUP_TYPE_SET.has(groupType as GroupType)) {
      throw new BadRequestException(
        VALIDATION_MESSAGES.INVALID_GROUP_TYPE(Object.values(GROUP_TYPE)),
      );
    }

    const memberships = await this.membershipRepository.findMembershipsByGroup({
      groupType,
      groupId,
    });

    if (!memberships.length) {
      throw new NotFoundException(`No memberships found for group ${groupId}`);
    }

    return memberships;
  }

  /**
   * Retrieves all memberships for a user
   * @throws NotFoundException if no memberships are found
   */
  async getUserMemberships(userId: number): Promise<Membership[]> {
    const memberships =
      await this.membershipRepository.findUserMemberships(userId);

    if (!memberships.length) {
      throw new NotFoundException(`No memberships found for user ${userId}`);
    }

    return memberships;
  }

  /**
   * Updates a membership with validation
   * @throws BadRequestException if validation fails
   */
  async updateMembership(
    where: Prisma.MembershipWhereUniqueInput,
    data: Prisma.MembershipUpdateInput,
  ): Promise<Membership> {
    this.validateMembershipData(data);
    return this.membershipRepository.updateMembership(where, data);
  }

  /**
   * Soft deletes a membership
   * @throws NotFoundException if membership doesn't exist
   */
  async deleteMembership(id: number): Promise<Membership> {
    return this.membershipRepository.softDelete({ id });
  }

  /**
   * Restores a soft-deleted membership
   * @throws NotFoundException if membership doesn't exist
   */
  async restoreMembership(id: number): Promise<Membership> {
    return this.membershipRepository.restore({ id });
  }

  /**
   * Validates membership data for both creation and updates
   * @throws BadRequestException if validation fails
   */
  private validateMembershipData(data: {
    groupType?: string | Prisma.StringFieldUpdateOperationsInput;
    role?: string | Prisma.StringFieldUpdateOperationsInput;
  }): void {
    // Extract values from either string or Prisma update operation
    const groupType =
      typeof data.groupType === 'string' ? data.groupType : data.groupType?.set;
    const role = typeof data.role === 'string' ? data.role : data.role?.set;

    if (
      groupType &&
      !MembershipService.GROUP_TYPE_SET.has(groupType as GroupType)
    ) {
      throw new BadRequestException(
        VALIDATION_MESSAGES.INVALID_GROUP_TYPE(Object.values(GROUP_TYPE)),
      );
    }

    if (role && !MembershipService.ROLE_SET.has(role as Role)) {
      throw new BadRequestException(
        VALIDATION_MESSAGES.INVALID_ROLE(Object.values(ROLE)),
      );
    }
  }
}
