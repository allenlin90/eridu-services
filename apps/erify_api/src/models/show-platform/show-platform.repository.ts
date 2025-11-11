import { Injectable } from '@nestjs/common';
import { Prisma, ShowPlatform } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '@/common/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type ShowPlatformWithIncludes<T extends Prisma.ShowPlatformInclude> =
  Prisma.ShowPlatformGetPayload<{
    include: T;
  }>;

// Custom model wrapper that implements IBaseModel with ShowPlatformWhereInput
class ShowPlatformModelWrapper
  implements
    IBaseModel<
      ShowPlatform,
      Prisma.ShowPlatformCreateInput,
      Prisma.ShowPlatformUpdateInput,
      Prisma.ShowPlatformWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.ShowPlatformDelegate) {}

  async create(args: {
    data: Prisma.ShowPlatformCreateInput;
    include?: Record<string, any>;
  }): Promise<ShowPlatform> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.ShowPlatformWhereInput;
    include?: Record<string, any>;
  }): Promise<ShowPlatform | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ShowPlatformWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<ShowPlatform[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.ShowPlatformWhereUniqueInput;
    data: Prisma.ShowPlatformUpdateInput;
    include?: Record<string, any>;
  }): Promise<ShowPlatform> {
    return this.prismaModel.update(args);
  }

  async delete(args: {
    where: Prisma.ShowPlatformWhereUniqueInput;
  }): Promise<ShowPlatform> {
    return this.prismaModel.delete(args);
  }

  async count(args: { where: Prisma.ShowPlatformWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class ShowPlatformRepository extends BaseRepository<
  ShowPlatform,
  Prisma.ShowPlatformCreateInput,
  Prisma.ShowPlatformUpdateInput,
  Prisma.ShowPlatformWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ShowPlatformModelWrapper(prisma.showPlatform));
  }

  async findByUid<T extends Prisma.ShowPlatformInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByShowAndPlatform(
    showId: bigint,
    platformId: bigint,
  ): Promise<ShowPlatform | null> {
    return this.model.findFirst({
      where: { showId, platformId, deletedAt: null },
    });
  }

  async findByShow(
    showId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
      include?: Prisma.ShowPlatformInclude;
    },
  ): Promise<ShowPlatform[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: { showId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findByPlatform(
    platformId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
      include?: Prisma.ShowPlatformInclude;
    },
  ): Promise<ShowPlatform[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: { platformId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findActiveShowPlatforms(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
    include?: Prisma.ShowPlatformInclude;
  }): Promise<ShowPlatform[]> {
    const { skip, take, orderBy, include } = params;
    return this.model.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async update(
    where: Prisma.ShowPlatformWhereUniqueInput,
    data: Prisma.ShowPlatformUpdateInput,
    include?: Prisma.ShowPlatformInclude,
  ): Promise<ShowPlatform> {
    return this.prisma.showPlatform.update({
      where,
      data,
      ...(include && { include }),
    });
  }

  async softDelete(
    where: Prisma.ShowPlatformWhereUniqueInput,
  ): Promise<ShowPlatform> {
    return this.prisma.showPlatform.update({
      where,
      data: { deletedAt: new Date() },
    });
  }
}
