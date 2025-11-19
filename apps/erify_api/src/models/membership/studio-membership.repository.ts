import { Injectable } from '@nestjs/common';
import { Prisma, StudioMembership } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
  WithSoftDelete,
} from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

// Type aliases for better readability and type safety
type UserId = Prisma.UserWhereUniqueInput['id'];
type StudioId = bigint;

type StudioMembershipWithIncludes<T extends Prisma.StudioMembershipInclude> =
  Prisma.StudioMembershipGetPayload<{
    include: T;
  }>;

class StudioMembershipModelWrapper
  implements
    IBaseModel<
      StudioMembership & WithSoftDelete,
      Prisma.StudioMembershipCreateInput,
      Prisma.StudioMembershipUpdateInput,
      Prisma.StudioMembershipWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.StudioMembershipDelegate) {}

  async create(args: {
    data: Prisma.StudioMembershipCreateInput;
    include?: Record<string, any>;
  }): Promise<StudioMembership & WithSoftDelete> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.StudioMembershipWhereInput;
    include?: Record<string, any>;
  }): Promise<(StudioMembership & WithSoftDelete) | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.StudioMembershipWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<(StudioMembership & WithSoftDelete)[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.StudioMembershipWhereUniqueInput;
    data: Prisma.StudioMembershipUpdateInput;
    include?: Record<string, any>;
  }): Promise<StudioMembership & WithSoftDelete> {
    return this.prismaModel.update(args);
  }

  async delete(args: {
    where: Prisma.StudioMembershipWhereUniqueInput;
  }): Promise<StudioMembership & WithSoftDelete> {
    return this.prismaModel.delete(args);
  }

  async count(args: {
    where: Prisma.StudioMembershipWhereInput;
  }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class StudioMembershipRepository extends BaseRepository<
  StudioMembership & WithSoftDelete,
  Prisma.StudioMembershipCreateInput,
  Prisma.StudioMembershipUpdateInput,
  Prisma.StudioMembershipWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new StudioMembershipModelWrapper(prisma.studioMembership));
  }

  async createStudioMembership<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    data: Prisma.StudioMembershipCreateInput,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    return this.prisma.studioMembership.create({
      data,
      ...(include && { include }),
    }) as Promise<StudioMembership | StudioMembershipWithIncludes<T>>;
  }

  async findStudioMembershipsByStudio<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(params: {
    studioId: StudioId;
    include?: T;
  }): Promise<(StudioMembership | StudioMembershipWithIncludes<T>)[]> {
    const { studioId, include } = params;
    return this.prisma.studioMembership.findMany({
      where: { studioId, deletedAt: null },
      ...(include && { include }),
    }) as Promise<(StudioMembership | StudioMembershipWithIncludes<T>)[]>;
  }

  async findUserStudioMemberships<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    userId: UserId,
    include?: T,
  ): Promise<(StudioMembership | StudioMembershipWithIncludes<T>)[]> {
    return this.prisma.studioMembership.findMany({
      where: { userId, deletedAt: null },
      ...(include && { include }),
    }) as Promise<(StudioMembership | StudioMembershipWithIncludes<T>)[]>;
  }

  /**
   * Find admin studio membership for user by ext_id
   * Returns the first admin membership found (user can have admin role in multiple studios)
   * This is optimized to query in a single database call by joining User and StudioMembership
   *
   * @param extId - User's external ID (from JWT payload)
   * @param include - Optional Prisma include to load relations (e.g., { user: true, studio: true })
   * @returns StudioMembership with optional relations, or null if user is not admin
   */
  async findAdminMembershipByExtId<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    extId: string,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T> | null> {
    return this.prisma.studioMembership.findFirst({
      where: {
        user: {
          extId: extId,
          deletedAt: null,
        },
        role: 'admin',
        deletedAt: null,
      },
      ...(include && { include }),
    }) as Promise<StudioMembership | StudioMembershipWithIncludes<T> | null>;
  }

  async updateStudioMembership<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    where: Prisma.StudioMembershipWhereInput,
    data: Prisma.StudioMembershipUpdateInput,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    return this.model.update({
      where: { ...where, deletedAt: null },
      data,
      ...(include && { include }),
    }) as Promise<StudioMembership | StudioMembershipWithIncludes<T>>;
  }

  async findByUid<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<
    StudioMembership | Prisma.StudioMembershipGetPayload<{ include: T }> | null
  > {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  // Methods using unique where clauses for better performance
  async updateByUnique<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    where: Prisma.StudioMembershipWhereUniqueInput,
    data: Prisma.StudioMembershipUpdateInput,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    return this.prisma.studioMembership.update({
      where,
      data,
      ...(include && { include }),
    }) as Promise<StudioMembership | StudioMembershipWithIncludes<T>>;
  }

  async deleteByUnique(
    where: Prisma.StudioMembershipWhereUniqueInput,
  ): Promise<StudioMembership> {
    return this.prisma.studioMembership.delete({ where });
  }

  async softDeleteByUnique(
    where: Prisma.StudioMembershipWhereUniqueInput,
  ): Promise<StudioMembership> {
    return this.prisma.studioMembership.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async restoreByUnique(
    where: Prisma.StudioMembershipWhereUniqueInput,
  ): Promise<StudioMembership> {
    return this.prisma.studioMembership.update({
      where,
      data: { deletedAt: null },
    });
  }
}
