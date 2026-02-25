import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';

@Injectable()
export class ScheduleRestorationProcessor {
  constructor(
    private readonly scheduleSnapshotService: ScheduleSnapshotService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  /**
   * Performs the atomic restoration logic.
   * Extraction to separate service allows @Transactional to work via NestJS DI proxy.
   */
  @Transactional()
  async restore(
    schedule: { id: bigint; planDocument: Prisma.JsonValue; version: number; status: string },
    snapshot: { planDocument: Prisma.JsonValue },
    userId: bigint,
  ) {
    // 1. Create a snapshot of current state before restore (for rollback)
    await this.scheduleSnapshotService.createScheduleSnapshot({
      schedule: { connect: { id: schedule.id } },
      planDocument: schedule.planDocument as Prisma.InputJsonValue,
      version: schedule.version,
      status: schedule.status,
      snapshotReason: 'before_restore',
      user: { connect: { id: userId } },
    });

    // 2. Restore plan document from snapshot
    return this.txHost.tx.schedule.update({
      where: { id: schedule.id },
      data: {
        planDocument: snapshot.planDocument as Prisma.InputJsonValue,
        version: schedule.version + 1,
        updatedAt: new Date(),
      },
      include: {
        client: true,
        createdByUser: true,
        publishedByUser: true,
      },
    });
  }
}
