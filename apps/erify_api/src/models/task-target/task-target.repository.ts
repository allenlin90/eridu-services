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

  async findByShowId(showId: bigint): Promise<TaskTarget[]> {
    return this.model.findMany({
      where: { showId, deletedAt: null },
    });
  }

  async findByShowIds(showIds: bigint[]): Promise<TaskTarget[]> {
    return this.model.findMany({
      where: { showId: { in: showIds }, deletedAt: null },
    });
  }

  async findByTaskId(taskId: bigint): Promise<TaskTarget[]> {
    return this.model.findMany({
      where: { taskId, deletedAt: null },
    });
  }
}
