import { Injectable } from '@nestjs/common';
import type { Prisma, Studio } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

export type StudioListParams = {
  skip?: number;
  take?: number;
  name?: string;
  uid?: string;
  include_deleted?: boolean;
  sort?: 'asc' | 'desc';
};

@Injectable()
export class StudioRepository extends BaseRepository<
  Studio,
  Prisma.StudioCreateInput,
  Prisma.StudioUpdateInput,
  Prisma.StudioWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.studio));
  }

  async findByUid<T extends Prisma.StudioInclude>(
    uid: string,
    include?: T,
  ): Promise<Prisma.StudioGetPayload<{ include: T }> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      include,
    }) as Promise<Prisma.StudioGetPayload<{ include: T }> | null>;
  }

  async findPaginated<T extends Prisma.StudioInclude>(
    params: StudioListParams,
    include?: T,
  ): Promise<{ data: Prisma.StudioGetPayload<{ include: T }>[]; total: number }> {
    const where = this.buildWhereClause(params);
    const orderBy = this.buildOrderByClause(params);

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy,
        include,
      }),
      this.model.count({ where }),
    ]);

    return {
      data: data as Prisma.StudioGetPayload<{ include: T }>[],
      total,
    };
  }

  private buildWhereClause(params: StudioListParams): Prisma.StudioWhereInput {
    const where: Prisma.StudioWhereInput = {};

    if (!params.include_deleted) {
      where.deletedAt = null;
    }

    if (params.name) {
      where.name = {
        contains: params.name,
        mode: 'insensitive',
      };
    }

    if (params.uid) {
      where.uid = {
        contains: params.uid,
        mode: 'insensitive',
      };
    }

    return where;
  }

  private buildOrderByClause(
    params: StudioListParams,
  ): Prisma.StudioOrderByWithRelationInput {
    return {
      createdAt: params.sort || 'desc',
    };
  }
}
