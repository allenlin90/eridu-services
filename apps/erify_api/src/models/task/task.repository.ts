import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, Task, TaskStatus, TaskType } from '@prisma/client';

import {
  type ListMyTasksQueryTransformed,
  SCENE_REVIEW_MODE,
  type SceneReviewQueryTransformed,
} from '@eridu/api-types/task-management';

import {
  buildReviewStatsTabCriteria,
  buildTaskListOrderBy,
  buildTaskListWhere,
  type ReviewStatsTab,
  taskListInclude,
  taskListIncludeWithSchema,
} from './task-list-query';
import type {
  TaskWithRelations,
  TaskWithSnapshotTargets,
} from './task-relation-query';
import {
  sceneReviewCandidateInclude,
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

  // Overrides BaseRepository.findMany (which reads through the non-transactional
  // model wrapper) so reads inside a transaction can see uncommitted writes made
  // earlier in that same transaction.
  async findMany(params: {
    where?: Prisma.TaskWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.TaskOrderByWithRelationInput;
    include?: Prisma.TaskInclude;
    includeDeleted?: boolean;
  }): Promise<Task[]> {
    const where = params.includeDeleted
      ? params.where
      : { ...params.where, deletedAt: null };

    return this.delegate.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      ...(params.include && { include: params.include }),
    });
  }

  async update(
    where: Prisma.TaskWhereUniqueInput,
    data: Prisma.TaskUpdateInput,
    include?: Prisma.TaskInclude,
  ): Promise<Task> {
    return this.delegate.update({
      where: { ...where, deletedAt: null },
      data,
      ...(include && { include }),
    });
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

  /**
   * Sibling tasks bound to the same show, in one of the supplied active
   * statuses, excluding the task being submitted. Used by the PR 12.0.5
   * cross-task collision guard to detect when two operator surfaces would
   * race to write the same fact key against the same show. The snapshot
   * is included so the caller can inspect bound `system_fact_key`s without
   * a second round-trip.
   */
  async findActiveTasksForShowExcluding(
    showId: bigint,
    excludeTaskId: bigint,
    statuses: TaskStatus[],
  ): Promise<Array<Task & { snapshot: { schema: unknown } | null }>> {
    return this.delegate.findMany({
      where: {
        deletedAt: null,
        id: { not: excludeTaskId },
        status: { in: statuses },
        targets: {
          some: {
            showId,
            targetType: 'SHOW',
            deletedAt: null,
          },
        },
      },
      include: {
        snapshot: { select: { schema: true } },
      },
    }) as unknown as Promise<Array<Task & { snapshot: { schema: unknown } | null }>>;
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
        include: taskListIncludeWithSchema,
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

  async findSceneReviewCandidates(
    studioUid: string,
    query: SceneReviewQueryTransformed,
  ) {
    const showCriteria: Prisma.ShowWhereInput = {
      deletedAt: null,
      startTime: {
        gte: new Date(query.show_start_from),
        lte: new Date(query.show_start_to),
      },
      ...(query.client_id ? { client: { uid: query.client_id } } : {}),
      ...(query.platform_id
        ? {
            showPlatforms: {
              some: {
                deletedAt: null,
                platform: { uid: query.platform_id },
              },
            },
          }
        : {}),
    };
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      studio: { uid: studioUid },
      ...(query.mode === SCENE_REVIEW_MODE.QC_INBOX ? { status: TaskStatus.REVIEW } : {}),
      AND: [
        {
          targets: {
            some: {
              targetType: 'SHOW',
              deletedAt: null,
              show: showCriteria,
            },
          },
        },
        ...(query.search
          ? [{
              OR: [
                { description: { contains: query.search, mode: 'insensitive' as const } },
                {
                  targets: {
                    some: {
                      targetType: 'SHOW',
                      deletedAt: null,
                      show: { name: { contains: query.search, mode: 'insensitive' as const } },
                    },
                  },
                },
              ],
            }]
          : []),
      ],
    };

    return this.delegate.findMany({
      where,
      include: sceneReviewCandidateInclude,
      orderBy: [{ updatedAt: 'desc' }, { uid: 'asc' }],
    });
  }

  async findSceneReviewCandidate(studioUid: string, taskUid: string) {
    return this.delegate.findFirst({
      where: {
        uid: taskUid,
        deletedAt: null,
        studio: { uid: studioUid },
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: { deletedAt: null },
          },
        },
      },
      include: sceneReviewCandidateInclude,
    });
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

    // Reserving an upload version is pre-submission bookkeeping, not a semantic
    // task mutation, so it must not gate on the task's optimistic-lock `version`.
    // A `version` guard here only produced spurious VersionConflict 409s when an
    // unrelated edit touched the task between this read and write, while giving
    // no protection against the real race: two concurrent reserves both read the
    // same version and — because neither bumps it — both writes pass anyway. The
    // resulting rare same-field concurrent-presign collision is accepted; see
    // docs/tech-debt/upload-version-reservation-race.md. The deletedAt guard is
    // kept so counters are never written onto a soft-deleted task.
    await this.delegate.update({
      where: { id: task.id, deletedAt: null },
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

  // Engineering decision: This method is necessary because it performs an optimistic concurrency snapshot transition
  // on a Task. It pre-reads existing metadata to merge JSONB objects in-memory, executes a version-gated update
  // statement to avoid concurrent modifications, and catches RecordNotFound to distinguish between a soft-deletion
  // and a version conflict. These concerns cannot be handled via simple findMany inlining at the service layer.
  async updateActiveTaskSnapshot(
    id: bigint,
    currentVersion: number,
    data: {
      snapshotId: bigint;
      description: string;
      type: TaskType;
      dueDate: Date;
      version: number;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<Task> {
    const existing = await this.delegate.findFirst({
      where: { id, deletedAt: null },
      select: { metadata: true, version: true },
    });

    if (!existing) {
      throw new Error('Task not found');
    }

    const existingMetadata = (existing.metadata && typeof existing.metadata === 'object')
      ? existing.metadata as Record<string, unknown>
      : {};

    const incomingMetadata = (data.metadata && typeof data.metadata === 'object')
      ? data.metadata as Record<string, unknown>
      : {};

    const newMetadata: Prisma.InputJsonObject = {
      ...existingMetadata,
      ...incomingMetadata,
    } as Prisma.InputJsonObject;

    try {
      return await this.delegate.update({
        where: { id, version: currentVersion, deletedAt: null },
        data: {
          snapshotId: data.snapshotId,
          description: data.description,
          type: data.type,
          dueDate: data.dueDate,
          version: data.version,
          metadata: newMetadata,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR.RecordNotFound) {
          const activeTask = await this.delegate.findFirst({
            where: { id, deletedAt: null },
            select: { version: true },
          });

          if (!activeTask) {
            throw error; // Actually not found
          }

          throw new VersionConflictError(
            'Task version is outdated',
            currentVersion,
            activeTask.version,
          );
        }
      }
      throw error;
    }
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

  async findTaskReviewStats(
    query: ListMyTasksQueryTransformed,
  ): Promise<Record<ReviewStatsTab, number>> {
    // Per-tab `where` construction (base scope + date-scope + tab filter) lives
    // in `buildReviewStatsTabCriteria`, which reuses the same `applyReviewTabFilter`
    // the list view uses. Here we only execute the counts.
    const criteria = buildReviewStatsTabCriteria(query);
    const keys = Object.keys(criteria) as ReviewStatsTab[];
    const counts = await Promise.all(
      keys.map((key) => this.delegate.count({ where: criteria[key] })),
    );
    return Object.fromEntries(
      keys.map((key, index) => [key, counts[index]]),
    ) as Record<ReviewStatsTab, number>;
  }

  // Engineering decision: This method is necessary because it assembles a multi-filter `where` clause
  // (completedAt range, dueDate range, status set, type set) plus a fixed reverse-chronological orderBy
  // for the MCP query tool. Building that `where` clause in the service would violate the no-Prisma-
  // query-building-in-services rule; a simple findMany pass-through cannot express the conditional
  // range/array filters without duplicating this logic at the call site.
  async findTasksForMcp(
    studioUid: string,
    filters: {
      completedAtFrom?: Date;
      completedAtTo?: Date;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      status?: TaskStatus[];
      type?: TaskType[];
      skip?: number;
      take?: number;
    },
  ): Promise<Task[]> {
    const { completedAtFrom, completedAtTo, dueDateFrom, dueDateTo, status, type, skip, take } = filters;
    const where: Prisma.TaskWhereInput = {
      studio: { uid: studioUid },
      deletedAt: null,
    };

    if (completedAtFrom || completedAtTo) {
      where.completedAt = {
        ...(completedAtFrom && { gte: completedAtFrom }),
        ...(completedAtTo && { lte: completedAtTo }),
      };
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {
        ...(dueDateFrom && { gte: dueDateFrom }),
        ...(dueDateTo && { lte: dueDateTo }),
      };
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    return this.delegate.findMany({
      where,
      orderBy: [
        { completedAt: 'desc' },
        { dueDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take,
      include: taskRelationInclude,
    }) as Promise<Task[]>;
  }
}
