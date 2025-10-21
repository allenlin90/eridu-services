import { Injectable } from '@nestjs/common';
import { Membership, Prisma } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
  WithSoftDelete,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

// Type aliases for better readability and type safety
type UserId = Prisma.UserWhereUniqueInput['id'];
type GroupId = bigint; // Direct BigInt type for group IDs

type MembershipWithIncludes<T extends Prisma.MembershipInclude> =
  Prisma.MembershipGetPayload<{
    include: T;
  }>;

class MembershipModelWrapper
  implements
    IBaseModel<
      Membership & WithSoftDelete,
      Prisma.MembershipCreateInput,
      Prisma.MembershipUpdateInput,
      Prisma.MembershipWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.MembershipDelegate) {}

  async create(args: {
    data: Prisma.MembershipCreateInput;
    include?: Record<string, any>;
  }): Promise<Membership & WithSoftDelete> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.MembershipWhereInput;
    include?: Record<string, any>;
  }): Promise<(Membership & WithSoftDelete) | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.MembershipWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<(Membership & WithSoftDelete)[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.MembershipWhereInput;
    data: Prisma.MembershipUpdateInput;
    include?: Record<string, any>;
  }): Promise<Membership & WithSoftDelete> {
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.update({
      where: { id: record.id },
      data: args.data,
      ...(args.include && { include: args.include }),
    });
  }

  async delete(args: {
    where: Prisma.MembershipWhereInput;
  }): Promise<Membership & WithSoftDelete> {
    // Prisma's delete requires unique where clause, but we accept non-unique WhereInput
    // So we need to find first to get the unique id, then delete
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.delete({ where: { id: record.id } });
  }

  async count(args: { where: Prisma.MembershipWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class MembershipRepository extends BaseRepository<
  Membership & WithSoftDelete,
  Prisma.MembershipCreateInput,
  Prisma.MembershipUpdateInput,
  Prisma.MembershipWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new MembershipModelWrapper(prisma.membership));
  }

  async createMembership<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    data: Prisma.MembershipCreateInput,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T>> {
    return this.prisma.membership.create({
      data,
      ...(include && { include }),
    }) as Promise<Membership | MembershipWithIncludes<T>>;
  }

  async findMembershipsByGroup<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(params: {
    groupType: string;
    groupId: GroupId;
    include?: T;
  }): Promise<(Membership | MembershipWithIncludes<T>)[]> {
    const { groupType, groupId, include } = params;
    return this.prisma.membership.findMany({
      where: { groupType, groupId, deletedAt: null },
      ...(include && { include }),
    }) as Promise<(Membership | MembershipWithIncludes<T>)[]>;
  }

  async findUserMemberships<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    userId: UserId,
    include?: T,
  ): Promise<(Membership | MembershipWithIncludes<T>)[]> {
    return this.prisma.membership.findMany({
      where: { userId, deletedAt: null },
      ...(include && { include }),
    }) as Promise<(Membership | MembershipWithIncludes<T>)[]>;
  }

  async updateMembership<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    where: Prisma.MembershipWhereInput,
    data: Prisma.MembershipUpdateInput,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T>> {
    return this.model.update({
      where: { ...where, deletedAt: null },
      data,
      ...(include && { include }),
    }) as Promise<Membership | MembershipWithIncludes<T>>;
  }

  async findByUid<T extends Prisma.MembershipInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<Membership | Prisma.MembershipGetPayload<{ include: T }> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  // New methods using unique where clauses for better performance
  async updateByUnique<
    T extends Prisma.MembershipInclude = Record<string, never>,
  >(
    where: Prisma.MembershipWhereUniqueInput,
    data: Prisma.MembershipUpdateInput,
    include?: T,
  ): Promise<Membership | MembershipWithIncludes<T>> {
    return this.prisma.membership.update({
      where,
      data,
      ...(include && { include }),
    }) as Promise<Membership | MembershipWithIncludes<T>>;
  }

  async deleteByUnique(
    where: Prisma.MembershipWhereUniqueInput,
  ): Promise<Membership> {
    return this.prisma.membership.delete({ where });
  }

  async softDeleteByUnique(
    where: Prisma.MembershipWhereUniqueInput,
  ): Promise<Membership> {
    return this.prisma.membership.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async restoreByUnique(
    where: Prisma.MembershipWhereUniqueInput,
  ): Promise<Membership> {
    return this.prisma.membership.update({
      where,
      data: { deletedAt: null },
    });
  }
}
