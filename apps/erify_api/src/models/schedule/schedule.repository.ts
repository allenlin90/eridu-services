import { Injectable } from '@nestjs/common';
import { Prisma, Schedule } from '@prisma/client';

import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

class ScheduleModelWrapper
implements
    IBaseModel<
      Schedule,
      Prisma.ScheduleCreateInput,
      Prisma.ScheduleUpdateInput,
      Prisma.ScheduleWhereInput
    > {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: {
    data: Prisma.ScheduleCreateInput;
    include?: Record<string, any>;
  }): Promise<Schedule> {
    return this.prisma.schedule.create(args);
  }

  async findFirst(args: {
    where: Prisma.ScheduleWhereInput;
    include?: Record<string, any>;
  }): Promise<Schedule | null> {
    return this.prisma.schedule.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ScheduleWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<Schedule[]> {
    return this.prisma.schedule.findMany(args);
  }

  async update(args: {
    where: Prisma.ScheduleWhereUniqueInput;
    data: Prisma.ScheduleUpdateInput;
    include?: Record<string, any>;
  }): Promise<Schedule> {
    return this.prisma.schedule.update(args);
  }

  async delete(args: {
    where: Prisma.ScheduleWhereUniqueInput;
  }): Promise<Schedule> {
    return this.prisma.schedule.delete(args);
  }

  async count(args: { where: Prisma.ScheduleWhereInput }): Promise<number> {
    return this.prisma.schedule.count(args);
  }
}

@Injectable()
export class ScheduleRepository extends BaseRepository<
  Schedule,
  Prisma.ScheduleCreateInput,
  Prisma.ScheduleUpdateInput,
  Prisma.ScheduleWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ScheduleModelWrapper(prisma));
  }

  async findByUid(
    uid: string,
    include?: Prisma.ScheduleInclude,
  ): Promise<Schedule | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async create(
    data: Prisma.ScheduleCreateInput,
    include?: Prisma.ScheduleInclude,
  ): Promise<Schedule> {
    return this.prisma.schedule.create({
      data,
      ...(include && { include }),
    });
  }

  async update(
    where: Prisma.ScheduleWhereUniqueInput,
    data: Prisma.ScheduleUpdateInput,
    include?: Prisma.ScheduleInclude,
  ): Promise<Schedule> {
    return this.prisma.schedule.update({
      where,
      data,
      ...(include && { include }),
    });
  }
}
