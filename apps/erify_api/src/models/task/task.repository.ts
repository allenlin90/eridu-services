import { Injectable } from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TaskRepository extends BaseRepository<
  Task,
  Prisma.TaskCreateInput,
  Prisma.TaskUpdateInput,
  Prisma.TaskWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.task));
  }

  async findByUid(
    uid: string,
    include?: Prisma.TaskInclude,
  ): Promise<Task | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByShowAndTemplate(
    showId: bigint,
    templateId: bigint,
  ): Promise<Task | null> {
    // Check if a task already exists for this show and template to ensure idempotency
    return this.prisma.task.findFirst({
      where: {
        templateId,
        deletedAt: null,
        targets: {
          some: {
            showId,
            targetType: 'SHOW',
            deletedAt: null,
          },
        },
      },
    });
  }

  async findTasksByShowIds(
    showIds: bigint[],
    include?: Prisma.TaskInclude,
  ): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        targets: {
          some: {
            showId: { in: showIds },
            targetType: 'SHOW',
            deletedAt: null,
          },
        },
      },
      ...(include && { include }),
      orderBy: {
        type: 'asc',
      },
    });
  }

  async updateAssigneeByTaskIds(
    taskIds: bigint[],
    assigneeId: bigint,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        deletedAt: null,
      },
      data: {
        assigneeId,
      },
    });
  }

  async softDelete(where: Prisma.TaskWhereUniqueInput): Promise<Task> {
    return this.prisma.task.update({
      where,
      data: { deletedAt: new Date() },
    });
  }
}
