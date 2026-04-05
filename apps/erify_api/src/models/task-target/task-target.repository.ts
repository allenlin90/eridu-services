import { Injectable } from '@nestjs/common';
import { Prisma, TaskTarget } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TaskTargetRepository extends BaseRepository<
  TaskTarget,
  Prisma.TaskTargetCreateInput,
  Prisma.TaskTargetUpdateInput,
  Prisma.TaskTargetWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.taskTarget));
  }

  // Engineering decision: cross-model join filter (task.deletedAt: null) cannot be expressed
  // as a flat where clause without leaking relation semantics into the caller.
  // This method encapsulates the "active task targets for a set of shows" query for all callers.
  async findByShowIds(showIds: bigint[]): Promise<TaskTarget[]> {
    return this.model.findMany({
      where: {
        showId: { in: showIds },
        deletedAt: null,
        task: {
          deletedAt: null,
        },
      },
    });
  }

  async undeleteByTaskId(taskId: bigint): Promise<Prisma.BatchPayload> {
    return this.prisma.taskTarget.updateMany({
      where: { taskId },
      data: { deletedAt: null },
    });
  }

  async hardDeleteByShowId(showId: bigint): Promise<Prisma.BatchPayload> {
    return this.prisma.taskTarget.deleteMany({
      where: { showId },
    });
  }
}
