import { Injectable } from '@nestjs/common';
import { Prisma, Show } from '@prisma/client';

import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

// Custom model wrapper that implements IBaseModel with ShowWhereInput
class ShowModelWrapper
  implements
    IBaseModel<
      Show,
      Prisma.ShowCreateInput,
      Prisma.ShowUpdateInput,
      Prisma.ShowWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.ShowDelegate) {}

  async create(args: {
    data: Prisma.ShowCreateInput;
    include?: Record<string, any>;
  }): Promise<Show> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.ShowWhereInput;
    include?: Record<string, any>;
  }): Promise<Show | null> {
    return this.prismaModel.findFirst(args);
  }

  async findFirstOrThrow(args: {
    where: Prisma.ShowWhereInput;
    include?: Record<string, any>;
  }): Promise<Show> {
    return this.prismaModel.findFirstOrThrow(args);
  }

  async findMany(args: {
    where?: Prisma.ShowWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<Show[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.ShowWhereUniqueInput;
    data: Prisma.ShowUpdateInput;
    include?: Record<string, any>;
  }): Promise<Show> {
    return this.prismaModel.update(args);
  }

  async delete(args: { where: Prisma.ShowWhereUniqueInput }): Promise<Show> {
    return this.prismaModel.delete(args);
  }

  async count(args: { where: Prisma.ShowWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class ShowRepository extends BaseRepository<
  Show,
  Prisma.ShowCreateInput,
  Prisma.ShowUpdateInput,
  Prisma.ShowWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ShowModelWrapper(prisma.show));
  }

  async findByUid(
    uid: string,
    include?: Prisma.ShowInclude,
  ): Promise<Show | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByName(name: string): Promise<Show | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveShows(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowOrderByWithRelationInput;
    include?: Prisma.ShowInclude;
  }): Promise<Show[]> {
    const { skip, take, orderBy, include } = params;
    return this.model.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findShowsByClient(
    clientId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: { clientId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findShowsByStudioRoom(
    studioRoomId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: { studioRoomId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findShowsByDateRange(
    startDate: Date,
    endDate: Date,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: {
        deletedAt: null,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async update(
    where: Prisma.ShowWhereUniqueInput,
    data: Prisma.ShowUpdateInput,
    include?: Prisma.ShowInclude,
  ): Promise<Show> {
    return this.prisma.show.update({
      where,
      data,
      ...(include && { include }),
    });
  }

  async softDelete(where: Prisma.ShowWhereUniqueInput): Promise<Show> {
    return this.prisma.show.update({
      where,
      data: { deletedAt: new Date() },
    });
  }
}
