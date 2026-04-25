import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, Task, TaskStatus, TaskType } from '@prisma/client';

import type { ListMyTasksQueryTransformed } from '@eridu/api-types/task-management';

import {
  buildTaskListOrderBy,
  buildTaskListWhere,
  taskListInclude,
} from './task-list-query';
import type {
  TaskWithRelations,
  TaskWithSnapshotTargets,
} from './task-relation-query';
import {
  taskRelationInclude,
  taskSnapshotTargetInclude,
} from './task-relation-query';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.task));
  }

  private get delegate() {
    return this.txHost.tx.task;
  }

  async create(data: Prisma.TaskCreateInput, include?: Record<string, any>): Promise<Task> {
    return this.delegate.create({ data, ...(include && { include }) });
  }

  async findByUid(
    uid: string,
    include?: Prisma.TaskInclude,
  ): Promise<Task | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByUidWithSnapshot(
    uid: string,
  ): Promise<TaskWithSnapshotTargets | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      include: taskSnapshotTargetInclude,
    }) as Promise<TaskWithSnapshotTargets | null>;
  }

  async findByUidWithRelations(
    uid: string,
    assigneeId: bigint,
  ): Promise<TaskWithRelations | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null, assigneeId },
      include: taskRelationInclude,
    }) as Promise<TaskWithRelations | null>;
  }

  async findByUidWithRelationsAdmin(
    uid: string,
  ): Promise<TaskWithRelations | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      include: taskRelationInclude,
    }) as Promise<TaskWithRelations | null>;
  }

  async findByShowAndTemplate(
    showId: bigint,
    templateId: bigint,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Task | null> {
    // Check if a task already exists for this show and template to ensure idempotency
    return this.delegate.findFirst({
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

  async findTasksByShowIds(showIds: bigint[]): Promise<Task[]>;
  async findTasksByShowIds<T extends Prisma.TaskInclude>(
    showIds: bigint[],
    include: T,
  ): Promise<Array<Prisma.TaskGetPayload<{ include: T }>>>;
  async findTasksByShowIds(
    showIds: bigint[],
    include?: Prisma.TaskInclude,
  ) {
    return this.delegate.findMany({
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
    return this.delegate.updateMany({
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
      return await this.delegate.update({
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
    return this.delegate.update({
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
    const now = new Date();
    const task = await this.delegate.update({
      where,
      data: { deletedAt: now },
    });

    await this.txHost.tx.taskTarget.updateMany({
      where: { taskId: task.id, deletedAt: null },
      data: { deletedAt: now },
    });

    return task;
  }

  // Engineering decision: pre-start show delete treats task workflow records as disposable.
  // Hard delete (not soft delete) prevents orphaned task rows from accumulating and avoids
  // reviving stale workflow state on show restore. See STUDIO_SHOW_MANAGEMENT.md § Delete Rule.
  async hardDeleteByIds(taskIds: bigint[]): Promise<Prisma.BatchPayload> {
    if (taskIds.length === 0) {
      return { count: 0 };
    }

    return this.delegate.deleteMany({
      where: { id: { in: taskIds } },
    });
  }

  async findTasksByAssignee(
    assigneeId: bigint,
    query: ListMyTasksQueryTransformed,
    studioId?: bigint,
  ) {
    const { sort, page, limit } = query;
    const skip = (page - 1) * limit;
    const where = buildTaskListWhere(query, {
      assigneeId,
      studioId,
    });
    if (!where) {
      return { items: [], total: 0 };
    }
    const orderBy = buildTaskListOrderBy(sort);

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: taskListInclude,
      }),
      this.delegate.count({ where }),
    ]);

    return { items, total };
  }

  async findTasks(query: ListMyTasksQueryTransformed) {
    const { sort, page, limit } = query;
    const skip = (page - 1) * limit;
    const where = buildTaskListWhere(query);
    const orderBy = buildTaskListOrderBy(sort);

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: taskListInclude,
      }),
      this.delegate.count({ where }),
    ]);

    return { items, total };
  }

  async reserveMaterialAssetUploadVersion(taskUid: string, fieldKey: string): Promise<number> {
    const task = await this.delegate.findFirst({
      where: {
        uid: taskUid,
        deletedAt: null,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const metadataObj = (task.metadata && typeof task.metadata === 'object')
      ? task.metadata as Record<string, unknown>
      : {};
    const versionsRaw = metadataObj.material_asset_upload_versions;
    const versionsByField = (versionsRaw && typeof versionsRaw === 'object')
      ? versionsRaw as Record<string, unknown>
      : {};
    const currentVersionRaw = versionsByField[fieldKey];
    const currentVersion = typeof currentVersionRaw === 'number'
      ? currentVersionRaw
      : 0;
    const nextVersion = currentVersion + 1;

    await this.delegate.update({
      where: { id: task.id },
      data: {
        metadata: {
          ...metadataObj,
          material_asset_upload_versions: {
            ...versionsByField,
            [fieldKey]: nextVersion,
          },
        } as Prisma.InputJsonValue,
      },
    });

    return nextVersion;
  }

  async bulkSoftDelete(studioId: bigint, uids: string[]): Promise<Prisma.BatchPayload> {
    const now = new Date();

    // 1. Find the internal IDs of the tasks to delete (and verify studio scope)
    const tasks = await this.delegate.findMany({
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
    const result = await this.delegate.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: now },
    });

    // 3. Soft-delete the related task targets
    await this.txHost.tx.taskTarget.updateMany({
      where: {
        taskId: { in: ids },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    return result;
  }

  async resumeTask(
    id: bigint,
    data: {
      snapshotId: bigint;
      status: TaskStatus;
      version: number;
      dueDate: Date;
      type: TaskType;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<Task> {
    return this.delegate.update({
      where: { id },
      data: {
        deletedAt: null,
        status: data.status,
        type: data.type,
        snapshotId: data.snapshotId,
        dueDate: data.dueDate,
        content: {},
        metadata: data.metadata ?? {},
        version: data.version,
        completedAt: null,
      },
    });
  }

  async reassignTaskToShow(
    taskUid: string,
    showId: bigint,
    studioId: bigint,
    dueDate: Date | null,
  ): Promise<Task | null> {
    const task = await this.delegate.findFirst({
      where: { uid: taskUid, deletedAt: null },
      select: { id: true },
    });

    if (!task) {
      return null;
    }

    const currentShowTarget = await this.txHost.tx.taskTarget.findFirst({
      where: {
        taskId: task.id,
        targetType: 'SHOW',
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!currentShowTarget) {
      return null;
    }

    const existingTargetForShow = await this.txHost.tx.taskTarget.findFirst({
      where: {
        taskId: task.id,
        targetType: 'SHOW',
        targetId: showId,
      },
      select: { id: true },
    });

    if (existingTargetForShow) {
      if (existingTargetForShow.id !== currentShowTarget.id) {
        await this.txHost.tx.taskTarget.updateMany({
          where: {
            taskId: task.id,
            targetType: 'SHOW',
            deletedAt: null,
            id: { not: existingTargetForShow.id },
          },
          data: { deletedAt: new Date() },
        });
      }

      await this.txHost.tx.taskTarget.update({
        where: { id: existingTargetForShow.id },
        data: {
          deletedAt: null,
          targetId: showId,
          showId,
        },
      });
    } else {
      await this.txHost.tx.taskTarget.update({
        where: { id: currentShowTarget.id },
        data: {
          targetId: showId,
          showId,
          deletedAt: null,
        },
      });
    }

    return this.delegate.update({
      where: { id: task.id },
      data: {
        studioId,
        dueDate,
      },
    });
  }
}
