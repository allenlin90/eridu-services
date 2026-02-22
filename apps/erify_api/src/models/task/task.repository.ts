import { Injectable } from '@nestjs/common';
import { Prisma, Task, TaskTemplateSnapshot } from '@prisma/client';

import type { ListMyTasksQueryTransformed } from '@eridu/api-types/task-management';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
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

  async findByUidWithSnapshot(
    uid: string,
  ): Promise<(Task & { snapshot: TaskTemplateSnapshot | null }) | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      include: { snapshot: true },
    }) as Promise<(Task & { snapshot: TaskTemplateSnapshot | null }) | null>;
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

  async updateWithVersionCheck(
    where: Prisma.TaskWhereUniqueInput & { version?: number },
    data: Prisma.TaskUpdateInput,
    include?: Prisma.TaskInclude,
  ): Promise<Task> {
    try {
      return await this.prisma.task.update({
        where: { ...where, deletedAt: null },
        data,
        ...(include && { include }),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR.RecordNotFound && where.version !== undefined) {
          const existing = await this.findOne({ uid: where.uid, deletedAt: null });

          if (!existing) {
            throw error; // Actually not found
          }

          throw new VersionConflictError(
            'Task version is outdated',
            where.version,
            existing.version,
          );
        }
      }
      throw error;
    }
  }

  async setAssignee(
    uid: string,
    membershipId: bigint | null,
    include?: Prisma.TaskInclude,
  ): Promise<Task> {
    return this.prisma.task.update({
      where: { uid, deletedAt: null },
      data: {
        assignee: membershipId !== null
          ? { connect: { id: membershipId } }
          : { disconnect: true },
      },
      ...(include && { include }),
    });
  }

  async softDelete(where: Prisma.TaskWhereUniqueInput): Promise<Task> {
    return this.prisma.task.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findTasksByAssignee(
    assigneeId: bigint,
    query: ListMyTasksQueryTransformed,
    studioId?: bigint,
  ) {
    const { status, due_date_from, due_date_to, sort, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      assigneeId,
      deletedAt: null,
    };

    if (studioId) {
      where.studioId = studioId;
    }

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (due_date_from || due_date_to) {
      where.dueDate = {};
      if (due_date_from)
        where.dueDate.gte = new Date(due_date_from);
      if (due_date_to)
        where.dueDate.lte = new Date(due_date_to);
    }

    let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort) {
      const [field, direction] = sort.split(':');
      if (field === 'due_date') {
        orderBy = { dueDate: direction as 'asc' | 'desc' };
      } else if (field === 'createdAt') {
        orderBy = { createdAt: direction as 'asc' | 'desc' };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          template: true,
          assignee: true,
          targets: {
            where: { targetType: 'SHOW', deletedAt: null },
            include: { show: true },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total };
  }
}
