import { Injectable } from '@nestjs/common';
import { Membership, Prisma } from '@prisma/client';

import {
  BaseRepository,
  WithSoftDelete,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipRepository extends BaseRepository<
  Membership & WithSoftDelete,
  Prisma.MembershipCreateInput,
  Prisma.MembershipUpdateInput,
  Prisma.MembershipWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.membership);
  }

  async createMembership(
    data: Prisma.MembershipCreateInput,
  ): Promise<Membership> {
    return await this.create(data);
  }

  async findMembershipsByGroup(params: {
    groupType: string;
    groupId: number;
  }): Promise<Membership[]> {
    const { groupType, groupId } = params;
    return await this.findMany({
      where: {
        groupType,
        groupId,
      },
    });
  }

  async findUserMemberships(userId: number): Promise<Membership[]> {
    return await this.findMany({
      where: {
        userId,
      },
    });
  }

  async updateMembership(
    where: Prisma.MembershipWhereInput,
    data: Prisma.MembershipUpdateInput,
  ): Promise<Membership> {
    return this.update(where, data);
  }
}
