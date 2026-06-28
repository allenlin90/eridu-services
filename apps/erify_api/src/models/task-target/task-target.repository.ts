import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, TaskTarget } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { FINALIZED_LOOP_TASK_STATUSES } from '@/models/task/task-finalized-loop.constants';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TaskTargetRepository extends BaseRepository<
  TaskTarget,
  Prisma.TaskTargetCreateInput,
  Prisma.TaskTargetUpdateInput,
  Prisma.TaskTargetWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.taskTarget));
  }

  private get delegate() {
    return this.txHost.tx.taskTarget;
  }

  async create(data: Prisma.TaskTargetCreateInput, include?: Record<string, any>): Promise<TaskTarget> {
    return this.delegate.create({ data, ...(include && { include }) });
  }

  // Engineering decision: cross-model join filter (task.deletedAt: null) cannot be expressed
  // as a flat where clause without leaking relation semantics into the caller.
  // This method encapsulates the "active task targets for a set of shows" query for all callers.
  async findByShowIds(showIds: bigint[]): Promise<TaskTarget[]> {
    return this.delegate.findMany({
      where: {
        showId: { in: showIds },
        deletedAt: null,
        task: {
          deletedAt: null,
        },
      },
    });
  }

  // Engineering decision: "active" excludes terminal task statuses in
  // addition to the soft-delete filters findByShowIds already applies — a
  // finalized task must not block a cancellation outcome that requires "no
  // active tasks." Reuses FINALIZED_LOOP_TASK_STATUSES so the terminal-status
  // list stays one type-checked source instead of another independently
  // maintained copy.
  async countActiveByShowId(showId: bigint): Promise<number> {
    return this.delegate.count({
      where: {
        showId,
        deletedAt: null,
        task: {
          deletedAt: null,
          status: { notIn: [...FINALIZED_LOOP_TASK_STATUSES] },
        },
      },
    });
  }

  async undeleteByTaskId(taskId: bigint): Promise<Prisma.BatchPayload> {
    return this.delegate.updateMany({
      where: { taskId },
      data: { deletedAt: null },
    });
  }

  // Engineering decision: pre-start show delete treats task-target workflow records as
  // disposable. Hard delete (not soft delete) prevents orphaned target rows from accumulating
  // and avoids reviving stale state on show restore. See STUDIO_SHOW_MANAGEMENT.md § Delete Rule.
  async hardDeleteByShowId(showId: bigint): Promise<Prisma.BatchPayload> {
    return this.delegate.deleteMany({
      where: { showId },
    });
  }
}
