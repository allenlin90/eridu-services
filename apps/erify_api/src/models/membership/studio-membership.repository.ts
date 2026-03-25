import { Injectable } from '@nestjs/common';
import { Prisma, StudioMembership } from '@prisma/client';

import {
  BaseRepository,
  PrismaModelWrapper,
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

@Injectable()
export class StudioMembershipRepository extends BaseRepository<
  StudioMembership & WithSoftDelete,
  Prisma.StudioMembershipCreateInput,
  Prisma.StudioMembershipUpdateInput,
  Prisma.StudioMembershipWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.studioMembership));
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
  },
  ): Promise<(StudioMembership | StudioMembershipWithIncludes<T>)[]> {
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

  async listStudioMemberships<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    params: {
      skip?: number;
      take?: number;
      uid?: string;
      studioId?: string;
      role?: string;
      userId?: UserId;
      name?: string;
    },
    include?: T,
  ): Promise<{
      data: (StudioMembership | StudioMembershipWithIncludes<T>)[];
      total: number;
    }> {
    const where: Prisma.StudioMembershipWhereInput = {
      deletedAt: null,
    };

    if (params.uid) {
      where.uid = {
        contains: params.uid,
        mode: 'insensitive',
      };
    }

    if (params.studioId) {
      where.studio = {
        uid: {
          contains: params.studioId,
          mode: 'insensitive',
        },
      };
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.name) {
      where.user = {
        name: {
          contains: params.name,
          mode: 'insensitive',
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.studioMembership.findMany({
        skip: params.skip,
        take: params.take,
        where,
        ...(include && { include }),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studioMembership.count({ where }),
    ]);

    return {
      data: data as (StudioMembership | StudioMembershipWithIncludes<T>)[],
      total,
    };
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
          extId,
          deletedAt: null,
        },
        role: 'admin',
        deletedAt: null,
      },
      ...(include && { include }),
    }) as Promise<StudioMembership | StudioMembershipWithIncludes<T> | null>;
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

  /**
   * Update a studio member's role and/or hourly rate.
   * Accepts domain-level payload and builds the Prisma input internally.
   */
  async updateStudioMember(
    uid: string,
    payload: { role?: string; baseHourlyRate?: number },
  ): Promise<Prisma.StudioMembershipGetPayload<{ include: { user: true } }>> {
    const data: Prisma.StudioMembershipUpdateInput = {};
    if (payload.role !== undefined) {
      data.role = payload.role;
    }
    if (payload.baseHourlyRate !== undefined) {
      data.baseHourlyRate = payload.baseHourlyRate.toFixed(2);
    }

    return this.prisma.studioMembership.update({
      where: { uid },
      data,
      include: { user: true },
    });
  }

  /**
   * List active memberships for a studio with embedded user info.
   * Used by the /studios/:studioId/members roster endpoint.
   */
  async listStudioMembersWithUser(
    studioUid: string,
    params: { skip?: number; take?: number; search?: string } = {},
  ): Promise<{ data: Prisma.StudioMembershipGetPayload<{ include: { user: { select: { uid: true; name: true; email: true } } } }>[], total: number }> {
    const where: Prisma.StudioMembershipWhereInput = {
      studio: { uid: studioUid },
      deletedAt: null,
    };

    if (params.search) {
      where.user = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const include = {
      user: {
        select: {
          uid: true as const,
          name: true as const,
          email: true as const,
        },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.studioMembership.findMany({
        where,
        include,
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.studioMembership.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find membership by user and studio regardless of deleted status.
   * Used by add-member flow to support re-invite/restore behavior.
   */
  async findByUserAndStudioIncludingDeleted(userUid: string, studioUid: string) {
    return this.prisma.studioMembership.findFirst({
      where: {
        user: { uid: userUid },
        studio: { uid: studioUid },
      },
    });
  }
}
