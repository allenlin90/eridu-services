import { Injectable } from '@nestjs/common';
import { Prisma, ShowStatus } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShowStatusRepository extends BaseRepository<
  ShowStatus,
  Prisma.ShowStatusCreateInput,
  Prisma.ShowStatusUpdateInput,
  Prisma.ShowStatusWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.showStatus));
  }

  async findByUid(
    uid: string,
    include?: Prisma.ShowStatusInclude,
  ): Promise<ShowStatus | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByName(name: string): Promise<ShowStatus | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async update(
    params: { uid: string },
    data: Prisma.ShowStatusUpdateInput,
    include?: Prisma.ShowStatusInclude,
  ): Promise<ShowStatus> {
    const { uid } = params;
    return this.prisma.showStatus.update({
      where: { uid, deletedAt: null },
      data,
      ...(include && { include }),
    });
  }

  async findPaginated(args: {
    skip?: number;
    take?: number;
    orderBy?: 'asc' | 'desc';
    include?: Prisma.ShowStatusInclude;
    where?: Prisma.ShowStatusWhereInput;
  }): Promise<{ data: ShowStatus[]; total: number }> {
    const { skip, take, orderBy, include, where } = args;

    const queryWhere: Prisma.ShowStatusWhereInput = {
      ...where,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        where: queryWhere,
        orderBy: orderBy ? { createdAt: orderBy } : undefined,
        include,
      }),
      this.model.count({ where: queryWhere }),
    ]);

    return { data, total };
  }
}
