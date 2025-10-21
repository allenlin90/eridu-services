import { Injectable } from '@nestjs/common';
import type { Prisma, ShowStandard } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

class ShowStandardModelWrapper
  implements
    IBaseModel<
      ShowStandard,
      Prisma.ShowStandardCreateInput,
      Prisma.ShowStandardUpdateInput,
      Prisma.ShowStandardWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: {
    data: Prisma.ShowStandardCreateInput;
    include?: Record<string, any>;
  }): Promise<ShowStandard> {
    return this.prisma.showStandard.create(args);
  }

  async findFirst(args: {
    where: Prisma.ShowStandardWhereInput;
    include?: Record<string, any>;
  }): Promise<ShowStandard | null> {
    return this.prisma.showStandard.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ShowStandardWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<ShowStandard[]> {
    return this.prisma.showStandard.findMany(args);
  }

  async update(args: {
    where: Prisma.ShowStandardWhereInput;
    data: Prisma.ShowStandardUpdateInput;
    include?: Record<string, any>;
  }): Promise<ShowStandard> {
    // For update operations, we need to find the record first using the where clause
    // and then update using a unique identifier
    const record = await this.prisma.showStandard.findFirst({
      where: args.where,
    });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prisma.showStandard.update({
      where: { id: record.id },
      data: args.data,
      ...(args.include && { include: args.include }),
    });
  }

  async delete(args: {
    where: Prisma.ShowStandardWhereInput;
  }): Promise<ShowStandard> {
    // For delete operations, we need to find the record first using the where clause
    // and then delete using a unique identifier
    const record = await this.prisma.showStandard.findFirst({
      where: args.where,
    });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prisma.showStandard.delete({ where: { id: record.id } });
  }

  async count(args: { where: Prisma.ShowStandardWhereInput }): Promise<number> {
    return this.prisma.showStandard.count({ where: args.where });
  }
}

@Injectable()
export class ShowStandardRepository extends BaseRepository<
  ShowStandard,
  Prisma.ShowStandardCreateInput,
  Prisma.ShowStandardUpdateInput,
  Prisma.ShowStandardWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ShowStandardModelWrapper(prisma));
  }

  async findByUid(uid: string): Promise<ShowStandard | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async findByName(name: string): Promise<ShowStandard | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }
}
