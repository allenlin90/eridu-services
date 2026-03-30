import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { ListUsersQueryDto } from '@/models/user/schemas/user.schema';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.user));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.model.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });
  }

  async findByExtId<T extends Prisma.UserInclude = Record<string, never>>(
    extId: string,
    include?: T,
  ): Promise<Prisma.UserGetPayload<{ include: T }> | null> {
    return this.model.findFirst({
      where: {
        extId,
        deletedAt: null,
      },
      include,
    }) as Promise<Prisma.UserGetPayload<{ include: T }> | null>;
  }

  // Specialized findByUid with typed include support
  async findByUid<T extends Prisma.UserInclude>(
    uid: string,
    include?: T,
  ): Promise<Prisma.UserGetPayload<{ include: T }> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      include,
    }) as Promise<Prisma.UserGetPayload<{ include: T }> | null>;
  }

  async createManyAndReturn(
    data: Prisma.UserCreateManyInput[],
  ): Promise<User[]> {
    // createManyAndReturn is available in newer Prisma versions
    // If it's not available in the generated client, we might need a fallback or upgrade
    // Assuming it's available as per user code attempt.
    // However, BaseRepository/IBaseModel doesn't expose it.
    // We access prisma directly.
    // If strict mode prevents accessing implicit methods, we might need to cast or just use it.
    // Note: createManyAndReturn is not on IBaseModel, so we use this.prisma.user
    return this.prisma.user.createManyAndReturn({
      data,
    });
  }

  async findActiveUsers(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: null, isBanned: false },
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
  }

  async searchUsersForCreatorOnboarding(params: {
    search: string;
    limit: number;
  }): Promise<User[]> {
    const search = params.search.trim();
    if (!search) {
      return [];
    }

    return this.model.findMany({
      where: {
        deletedAt: null,
        NOT: {
          creator: {
            is: {
              deletedAt: null,
            },
          },
        },
        OR: [
          { uid: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { extId: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
      take: params.limit,
    });
  }

  // Implementation of findPaginated matching the pattern
  async findPaginated(
    query: ListUsersQueryDto,
  ): Promise<{ data: User[]; total: number }> {
    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderByClause(query);

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip: query.skip,
        take: query.take,
        where,
        orderBy,
      }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }

  private buildWhereClause(query: ListUsersQueryDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    // Standard soft-delete filtering
    where.deletedAt = null;

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.uid) {
      where.uid = { contains: query.uid, mode: 'insensitive' };
    }

    if (query.extId) {
      where.extId = { contains: query.extId, mode: 'insensitive' };
    }

    if (query.isSystemAdmin !== undefined) {
      where.isSystemAdmin = query.isSystemAdmin;
    }

    return where;
  }

  private buildOrderByClause(
    query: ListUsersQueryDto,
  ): Prisma.UserOrderByWithRelationInput {
    // Correctly map string sort to object
    // Assuming query.sort is 'asc' | 'desc'
    const sortOrder = (query.sort === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;
    return {
      createdAt: sortOrder,
    };
  }
}
