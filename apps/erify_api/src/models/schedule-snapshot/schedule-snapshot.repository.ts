import { Injectable } from '@nestjs/common';
import { Prisma, ScheduleSnapshot } from '@prisma/client';

import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type ScheduleSnapshotWithDeletedAt = ScheduleSnapshot & { deletedAt: null };

class ScheduleSnapshotModelWrapper
  implements
    IBaseModel<
      ScheduleSnapshotWithDeletedAt,
      Prisma.ScheduleSnapshotCreateInput,
      Prisma.ScheduleSnapshotUpdateInput,
      Prisma.ScheduleSnapshotWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: {
    data: Prisma.ScheduleSnapshotCreateInput;
    include?: Record<string, any>;
  }): Promise<ScheduleSnapshotWithDeletedAt> {
    const result = await this.prisma.scheduleSnapshot.create(args);
    return result as ScheduleSnapshotWithDeletedAt;
  }

  async findFirst(args: {
    where: Prisma.ScheduleSnapshotWhereInput;
    include?: Record<string, any>;
  }): Promise<ScheduleSnapshotWithDeletedAt | null> {
    const result = await this.prisma.scheduleSnapshot.findFirst(args);
    return result ? (result as ScheduleSnapshotWithDeletedAt) : null;
  }

  async findMany(args: {
    where?: Prisma.ScheduleSnapshotWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<ScheduleSnapshotWithDeletedAt[]> {
    const result = await this.prisma.scheduleSnapshot.findMany(args);
    return result as ScheduleSnapshotWithDeletedAt[];
  }

  async update(args: {
    where: Prisma.ScheduleSnapshotWhereUniqueInput;
    data: Prisma.ScheduleSnapshotUpdateInput;
    include?: Record<string, any>;
  }): Promise<ScheduleSnapshotWithDeletedAt> {
    const result = await this.prisma.scheduleSnapshot.update(args);
    return result as ScheduleSnapshotWithDeletedAt;
  }

  async delete(args: {
    where: Prisma.ScheduleSnapshotWhereUniqueInput;
  }): Promise<ScheduleSnapshotWithDeletedAt> {
    const result = await this.prisma.scheduleSnapshot.delete(args);
    return result as ScheduleSnapshotWithDeletedAt;
  }

  async count(args: {
    where: Prisma.ScheduleSnapshotWhereInput;
  }): Promise<number> {
    return this.prisma.scheduleSnapshot.count(args);
  }
}

@Injectable()
export class ScheduleSnapshotRepository extends BaseRepository<
  ScheduleSnapshotWithDeletedAt,
  Prisma.ScheduleSnapshotCreateInput,
  Prisma.ScheduleSnapshotUpdateInput,
  Prisma.ScheduleSnapshotWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ScheduleSnapshotModelWrapper(prisma));
  }

  // Override methods since ScheduleSnapshot doesn't have deletedAt
  override async findOne(
    where: Prisma.ScheduleSnapshotWhereInput,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshotWithDeletedAt | null> {
    const result = await this.model.findFirst({
      where,
      ...(include && { include }),
    });
    return result ? result : null;
  }

  override async findMany(params: {
    where?: Prisma.ScheduleSnapshotWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: Prisma.ScheduleSnapshotInclude;
  }): Promise<ScheduleSnapshotWithDeletedAt[]> {
    const result = await this.model.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      ...(params.include && { include: params.include }),
    });
    return result;
  }

  override async update(
    where: Prisma.ScheduleSnapshotWhereInput,
    data: Prisma.ScheduleSnapshotUpdateInput,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshotWithDeletedAt> {
    const result = await this.model.update({
      where,
      data,
      ...(include && { include }),
    });
    return result;
  }

  override async delete(
    where: Prisma.ScheduleSnapshotWhereInput,
  ): Promise<ScheduleSnapshotWithDeletedAt> {
    const result = await this.model.delete({
      where,
    });
    return result;
  }

  override async count(
    where?: Prisma.ScheduleSnapshotWhereInput,
  ): Promise<number> {
    return this.model.count({
      where: where ?? {},
    });
  }

  async findByUid(
    uid: string,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.model.findFirst({
      where: { uid },
      ...(include && { include }),
    });
  }

  async findByScheduleId(
    scheduleId: bigint,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot[]> {
    return this.model.findMany({
      where: { scheduleId },
      orderBy: { createdAt: 'desc' },
      ...(include && { include }),
    });
  }

  async findByScheduleIdAndVersion(
    scheduleId: bigint,
    version: number,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.model.findFirst({
      where: { scheduleId, version },
      ...(include && { include }),
    });
  }

  // Disable soft delete for snapshots (they're immutable)
  override async softDelete(): Promise<never> {
    return Promise.reject(
      new Error('ScheduleSnapshot does not support soft delete'),
    );
  }

  override async restore(): Promise<never> {
    return Promise.reject(
      new Error('ScheduleSnapshot does not support restore'),
    );
  }
}
