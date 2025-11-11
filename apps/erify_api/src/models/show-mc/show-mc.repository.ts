import { Injectable } from '@nestjs/common';
import { Prisma, ShowMC } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '@/common/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type ShowMCWithIncludes<T extends Prisma.ShowMCInclude> =
  Prisma.ShowMCGetPayload<{
    include: T;
  }>;

// Custom model wrapper that implements IBaseModel with ShowMCWhereInput
class ShowMCModelWrapper
  implements
    IBaseModel<
      ShowMC,
      Prisma.ShowMCCreateInput,
      Prisma.ShowMCUpdateInput,
      Prisma.ShowMCWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.ShowMCDelegate) {}

  async create(args: {
    data: Prisma.ShowMCCreateInput;
    include?: Record<string, any>;
  }): Promise<ShowMC> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.ShowMCWhereInput;
    include?: Record<string, any>;
  }): Promise<ShowMC | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ShowMCWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<ShowMC[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.ShowMCWhereInput;
    data: Prisma.ShowMCUpdateInput;
    include?: Record<string, any>;
  }): Promise<ShowMC> {
    // For update operations, we need to find the record first using the where clause
    // and then update using a unique identifier
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.update({
      where: { id: record.id },
      data: args.data,
      ...(args.include && { include: args.include }),
    });
  }

  async delete(args: { where: Prisma.ShowMCWhereInput }): Promise<ShowMC> {
    // For delete operations, we need to find the record first using the where clause
    // and then delete using a unique identifier
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.delete({ where: { id: record.id } });
  }

  async count(args: { where: Prisma.ShowMCWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class ShowMcRepository extends BaseRepository<
  ShowMC,
  Prisma.ShowMCCreateInput,
  Prisma.ShowMCUpdateInput,
  Prisma.ShowMCWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ShowMCModelWrapper(prisma.showMC));
  }

  async findByUid<T extends Prisma.ShowMCInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByShowAndMc(showId: bigint, mcId: bigint): Promise<ShowMC | null> {
    return this.model.findFirst({
      where: { showId, mcId, deletedAt: null },
    });
  }

  async findByShow(
    showId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowMCOrderByWithRelationInput;
      include?: Prisma.ShowMCInclude;
    },
  ): Promise<ShowMC[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: { showId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findByMc(
    mcId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowMCOrderByWithRelationInput;
      include?: Prisma.ShowMCInclude;
    },
  ): Promise<ShowMC[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.model.findMany({
      where: { mcId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findActiveShowMcs(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowMCOrderByWithRelationInput;
    include?: Prisma.ShowMCInclude;
  }): Promise<ShowMC[]> {
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
    where: Prisma.ShowMCWhereUniqueInput,
    data: Prisma.ShowMCUpdateInput,
    include?: Prisma.ShowMCInclude,
  ): Promise<ShowMC> {
    return this.prisma.showMC.update({
      where,
      data,
      ...(include && { include }),
    });
  }

  async softDelete(where: Prisma.ShowMCWhereUniqueInput): Promise<ShowMC> {
    return this.prisma.showMC.update({
      where,
      data: { deletedAt: new Date() },
    });
  }
}
