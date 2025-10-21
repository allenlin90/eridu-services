import { Injectable } from '@nestjs/common';
import { MC, Prisma } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

type MCWithIncludes<T extends Prisma.MCInclude> = Prisma.MCGetPayload<{
  include: T;
}>;

// Custom model wrapper that implements IBaseModel with MCWhereInput
class MCModelWrapper
  implements
    IBaseModel<
      MC,
      Prisma.MCCreateInput,
      Prisma.MCUpdateInput,
      Prisma.MCWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.MCDelegate) {}

  async create(args: {
    data: Prisma.MCCreateInput;
    include?: Record<string, any>;
  }): Promise<MC> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.MCWhereInput;
    include?: Record<string, any>;
  }): Promise<MC | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.MCWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<MC[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.MCWhereInput;
    data: Prisma.MCUpdateInput;
    include?: Record<string, any>;
  }): Promise<MC> {
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

  async delete(args: { where: Prisma.MCWhereInput }): Promise<MC> {
    // For delete operations, we need to find the record first using the where clause
    // and then delete using a unique identifier
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.delete({ where: { id: record.id } });
  }

  async count(args: { where: Prisma.MCWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class McRepository extends BaseRepository<
  MC,
  Prisma.MCCreateInput,
  Prisma.MCUpdateInput,
  Prisma.MCWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new MCModelWrapper(prisma.mC));
  }

  async findByUid<T extends Prisma.MCInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<MC | MCWithIncludes<T> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByName(name: string): Promise<MC | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveMCs(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.MCOrderByWithRelationInput;
  }): Promise<MC[]> {
    const { skip, take, orderBy } = params;
    return this.model.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy,
    });
  }
}
