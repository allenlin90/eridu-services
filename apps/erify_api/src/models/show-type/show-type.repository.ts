import { Injectable } from '@nestjs/common';
import type { Prisma, ShowType } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShowTypeRepository extends BaseRepository<
  ShowType,
  Prisma.ShowTypeCreateInput,
  Prisma.ShowTypeUpdateInput,
  Prisma.ShowTypeWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.showType));
  }

  async findByUid(
    uid: string,
    include?: Prisma.ShowTypeInclude,
  ): Promise<ShowType | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByName(name: string): Promise<ShowType | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async update(
    params: { uid: string },
    data: Prisma.ShowTypeUpdateInput,
    include?: Prisma.ShowTypeInclude,
  ): Promise<ShowType> {
    const { uid } = params;
    return this.prisma.showType.update({
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
    include?: Prisma.ShowTypeInclude;
  }): Promise<{ data: ShowType[]; total: number }> {
    const { skip, take, name, uid, includeDeleted, orderBy, include } = args;

    const where: Prisma.ShowTypeWhereInput = {};

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
