import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ScheduleSnapshot } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';

/**
 * Repository for ScheduleSnapshot.
 * Note: Snapshots are immutable - they only support create, read, and hard delete operations.
 * Updates and soft deletes are not supported (the model has no `deletedAt` column,
 * so this repository intentionally does NOT extend BaseRepository).
 */
@Injectable()
export class ScheduleSnapshotRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(
    data: Prisma.ScheduleSnapshotCreateInput,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot> {
    // Route writes through txHost.tx so snapshot creation participates in the
    // ambient publish transaction (rolled back together on failure).
    return this.txHost.tx.scheduleSnapshot.create({
      data,
      ...(include && { include }),
    });
  }

  async findOne(
    where: Prisma.ScheduleSnapshotWhereInput,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.prisma.scheduleSnapshot.findFirst({
      where,
      ...(include && { include }),
    });
  }

  async findMany(params: {
    where?: Prisma.ScheduleSnapshotWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: Prisma.ScheduleSnapshotInclude;
  }): Promise<ScheduleSnapshot[]> {
    return this.prisma.scheduleSnapshot.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      ...(params.include && { include: params.include }),
    });
  }

  /**
   * Hard delete a snapshot.
   * Note: Snapshots are immutable and don't support soft delete.
   */
  async delete(
    where: Prisma.ScheduleSnapshotWhereUniqueInput,
  ): Promise<ScheduleSnapshot> {
    return this.txHost.tx.scheduleSnapshot.delete({
      where,
    });
  }

  async count(where?: Prisma.ScheduleSnapshotWhereInput): Promise<number> {
    return this.prisma.scheduleSnapshot.count({
      where: where ?? {},
    });
  }

  async findByUid(
    uid: string,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.findOne({ uid }, include);
  }

  async findByScheduleId(
    scheduleId: bigint,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot[]> {
    return this.findMany({
      where: { scheduleId },
      orderBy: { createdAt: 'desc' },
      include,
    });
  }

  async findByScheduleIdAndVersion(
    scheduleId: bigint,
    version: number,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.findOne({ scheduleId, version }, include);
  }
}
