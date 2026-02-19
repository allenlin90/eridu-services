import { Injectable } from '@nestjs/common';
import type { Prisma, ShowStandard } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShowStandardRepository extends BaseRepository<
  ShowStandard,
  Prisma.ShowStandardCreateInput,
  Prisma.ShowStandardUpdateInput,
  Prisma.ShowStandardWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.showStandard));
  }

  async findByUid(
    uid: string,
    include?: Prisma.ShowStandardInclude,
  ): Promise<ShowStandard | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByName(name: string): Promise<ShowStandard | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async update(
    params: { uid: string },
    data: Prisma.ShowStandardUpdateInput,
    include?: Prisma.ShowStandardInclude,
  ): Promise<ShowStandard> {
    const { uid } = params;
    return this.prisma.showStandard.update({
      where: { uid, deletedAt: null },
      data,
      ...(include && { include }),
    });
  }

  async findPaginated(args: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    includeDeleted?: boolean;
    orderBy?: 'asc' | 'desc';
    include?: Prisma.ShowStandardInclude;
  }): Promise<{ data: ShowStandard[]; total: number }> {
    const { skip, take, name, uid, includeDeleted, orderBy, include } = args;

    const where: Prisma.ShowStandardWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (uid) {
      where.uid = { contains: uid, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        where,
        orderBy: orderBy ? { createdAt: orderBy } : undefined,
        include,
      }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }
}
