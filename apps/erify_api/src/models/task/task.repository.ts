import { Injectable } from '@nestjs/common';
import { Prisma, Task, TaskStatus, TaskTemplateSnapshot } from '@prisma/client';

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
  ): Promise<(Task & { snapshot: TaskTemplateSnapshot | null; targets: { show: { uid: string; startTime: Date; endTime: Date } | null }[] }) | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      include: {
        snapshot: true,
        targets: {
          where: { targetType: 'SHOW', deletedAt: null },
          include: {
            show: {
              select: {
                uid: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    }) as Promise<(Task & { snapshot: TaskTemplateSnapshot | null; targets: { show: { uid: string; startTime: Date; endTime: Date } | null }[] }) | null>;
  }

  async findByShowAndTemplate(
    showId: bigint,
    templateId: bigint,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Task | null> {
    // Check if a task already exists for this show and template to ensure idempotency
    return this.prisma.task.findFirst({
      where: {
        templateId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        targets: {
          some: {
            showId,
            targetType: 'SHOW',
            ...(options.includeDeleted ? {} : { deletedAt: null }),
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
    const {
      status,
      task_type,
      due_date_from,
      due_date_to,
      search,
      sort,
      page,
      limit,
    } = query;
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

    if (task_type) {
      where.type = Array.isArray(task_type) ? { in: task_type } : task_type;
    }

    if (due_date_from || due_date_to) {
      where.dueDate = {};
      if (due_date_from)
        where.dueDate.gte = new Date(due_date_from);
      if (due_date_to)
        where.dueDate.lte = new Date(due_date_to);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        {
          targets: {
            some: {
              targetType: 'SHOW',
              deletedAt: null,
              show: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    let orderBy: Prisma.TaskOrderByWithRelationInput = { dueDate: 'asc' };
    if (sort) {
      const [field, direction] = sort.split(':');
      const sortDirection = direction === 'desc' ? 'desc' : 'asc';
      if (field === 'due_date') {
        orderBy = { dueDate: sortDirection };
      } else if (field === 'updated_at' || field === 'updatedAt') {
        orderBy = { updatedAt: sortDirection };
      } else if (field === 'createdAt' || field === 'created_at') {
        orderBy = { createdAt: sortDirection };
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
          snapshot: {
            select: {
              schema: true,
              version: true,
            },
          },
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

  async bulkSoftDelete(studioId: bigint, uids: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Find the internal IDs of the tasks to delete (and verify studio scope)
      const tasks = await tx.task.findMany({
        where: {
          uid: { in: uids },
          studioId,
          deletedAt: null,
        },
        select: { id: true },
      });

      const ids = tasks.map((t) => t.id);
      if (ids.length === 0) {
        return { count: 0 };
      }

      // 2. Soft-delete the tasks
      const result = await tx.task.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: now },
      });

      // 3. Soft-delete the related task targets
      await tx.taskTarget.updateMany({
        where: {
          taskId: { in: ids },
          deletedAt: null,
        },
        data: { deletedAt: now },
      });

      return result;
    });
  }

  async resumeTask(
    id: bigint,
    data: { snapshotId: bigint; status: TaskStatus; version: number; dueDate: Date },
  ): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: null,
        status: data.status,
        snapshotId: data.snapshotId,
        dueDate: data.dueDate,
        content: {},
        metadata: {},
        version: data.version,
        completedAt: null,
      },
    });
  }
}
