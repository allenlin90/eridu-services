import { Injectable } from '@nestjs/common';
import type { Prisma, ShowStatus } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

class ShowStatusModelWrapper
  implements
    IBaseModel<
      ShowStatus,
      Prisma.ShowStatusCreateInput,
      Prisma.ShowStatusUpdateInput,
      Prisma.ShowStatusWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: {
    data: Prisma.ShowStatusCreateInput;
    include?: Record<string, any>;
  }): Promise<ShowStatus> {
    return this.prisma.showStatus.create(args);
  }

  async findFirst(args: {
    where: Prisma.ShowStatusWhereInput;
    include?: Record<string, any>;
  }): Promise<ShowStatus | null> {
    return this.prisma.showStatus.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ShowStatusWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<ShowStatus[]> {
    return this.prisma.showStatus.findMany(args);
  }

  async update(args: {
    where: Prisma.ShowStatusWhereInput;
    data: Prisma.ShowStatusUpdateInput;
    include?: Record<string, any>;
  }): Promise<ShowStatus> {
    // For update operations, we need to find the record first using the where clause
    // and then update using a unique identifier
    const record = await this.prisma.showStatus.findFirst({
      where: args.where,
    });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prisma.showStatus.update({
      where: { id: record.id },
      data: args.data,
      ...(args.include && { include: args.include }),
    });
  }

  async delete(args: {
    where: Prisma.ShowStatusWhereInput;
  }): Promise<ShowStatus> {
    // For delete operations, we need to find the record first using the where clause
    // and then delete using a unique identifier
    const record = await this.prisma.showStatus.findFirst({
      where: args.where,
    });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prisma.showStatus.delete({ where: { id: record.id } });
  }

  async count(args: { where: Prisma.ShowStatusWhereInput }): Promise<number> {
    return this.prisma.showStatus.count({ where: args.where });
  }
}

@Injectable()
export class ShowStatusRepository extends BaseRepository<
  ShowStatus,
  Prisma.ShowStatusCreateInput,
  Prisma.ShowStatusUpdateInput,
  Prisma.ShowStatusWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ShowStatusModelWrapper(prisma));
  }

  async findByUid(uid: string): Promise<ShowStatus | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async findByName(name: string): Promise<ShowStatus | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }
}
