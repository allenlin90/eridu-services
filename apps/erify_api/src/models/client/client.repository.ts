import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { ListClientsQueryDto } from '@/models/client/schemas/client.schema';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ClientRepository extends BaseRepository<
  Client,
  Prisma.ClientCreateInput,
  Prisma.ClientUpdateInput,
  Prisma.ClientWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.client));
  }

  /**
   * Finds a client by UID.
   */
  async findByUid<T extends Prisma.ClientInclude>(
    uid: string,
    include?: T,
  ): Promise<Prisma.ClientGetPayload<{ include: T }> | null> {
    return this.findOne({ uid }, include) as Promise<Prisma.ClientGetPayload<{
      include: T;
    }> | null>;
  }

  /**
   * Finds a client by name.
   */
  async findByName(name: string): Promise<Client | null> {
    return this.findOne({ name });
  }

  /**
   * Lists clients with pagination and complex filtering.
   */
  async findPaginated(
    query: ListClientsQueryDto,
    include?: Prisma.ClientInclude,
  ): Promise<{ data: Client[]; total: number }> {
    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderByClause(query);

    const [data, total] = await Promise.all([
      this.findMany({
        skip: query.skip,
        take: query.take,
        where,
        orderBy,
        include,
      }),
      this.count(where),
    ]);

    return { data, total };
  }

  private buildWhereClause(query: ListClientsQueryDto): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = {};

    if (!query.include_deleted) {
      where.deletedAt = null;
    }

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.uid) {
      where.uid = {
        contains: query.uid,
        mode: 'insensitive',
      };
    }

    return where;
  }

  private buildOrderByClause(
    query: ListClientsQueryDto,
  ): Prisma.ClientOrderByWithRelationInput {
    return {
      createdAt: query.sort || 'desc',
    };
  }
}
