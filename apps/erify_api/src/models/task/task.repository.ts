import { Injectable } from '@nestjs/common';
import { Prisma, Task, TaskStatus, TaskTemplateSnapshot, TaskType } from '@prisma/client';

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
  ): Promise<(Task & { snapshot: TaskTemplateSnapshot | null; targets: { show: { id: bigint; uid: string; externalId: string | null; studioId: bigint | null; startTime: Date; endTime: Date; client: { name: string } | null; showMCs: { mc: { name: string; aliasName: string } }[] } | null }[] }) | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      include: {
        snapshot: true,
        targets: {
          where: { targetType: 'SHOW', deletedAt: null },
          include: {
            show: {
              select: {
                id: true,
                uid: true,
                externalId: true,
                studioId: true,
                startTime: true,
                endTime: true,
                client: {
                  select: {
                    name: true,
                  },
                },
                showMCs: {
                  where: { deletedAt: null },
                  include: {
                    mc: {
                      select: {
                        name: true,
                        aliasName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<(Task & { snapshot: TaskTemplateSnapshot | null; targets: { show: { id: bigint; uid: string; externalId: string | null; studioId: bigint | null; startTime: Date; endTime: Date; client: { name: string } | null; showMCs: { mc: { name: string; aliasName: string } }[] } | null }[] }) | null>;
  }

  async findByUidWithRelations(
    uid: string,
    assigneeId: bigint,
  ): Promise<(Task & {
    template: { uid: string; name: string } | null;
    snapshot: { schema: unknown; version: number } | null;
    assignee: { uid: string; name: string } | null;
    targets: {
      show: {
        uid: string;
        name: string;
        startTime: Date;
        endTime: Date;
        client: { name: string } | null;
        studioRoom: { name: string } | null;
        showMCs: { mc: { name: string; aliasName: string } }[];
      } | null;
    }[];
  }) | null> {
    return this.prisma.task.findFirst({
      where: { uid, deletedAt: null, assigneeId },
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
          include: {
            show: {
              include: {
                client: {
                  select: {
                    name: true,
                  },
                },
                studioRoom: {
                  select: {
                    name: true,
                  },
                },
                showMCs: {
                  where: { deletedAt: null },
                  include: {
                    mc: {
                      select: {
                        name: true,
                        aliasName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<(Task & {
      template: { uid: string; name: string } | null;
      snapshot: { schema: unknown; version: number } | null;
      assignee: { uid: string; name: string } | null;
      targets: {
        show: {
          uid: string;
          name: string;
          startTime: Date;
          endTime: Date;
          client: { name: string } | null;
          studioRoom: { name: string } | null;
          showMCs: { mc: { name: string; aliasName: string } }[];
        } | null;
      }[];
    }) | null>;
  }

  async findByUidWithRelationsAdmin(
    uid: string,
  ): Promise<(Task & {
    template: { uid: string; name: string } | null;
    snapshot: { schema: unknown; version: number } | null;
    assignee: { uid: string; name: string } | null;
    targets: {
      show: {
        uid: string;
        name: string;
        startTime: Date;
        endTime: Date;
        client: { name: string } | null;
        studioRoom: { name: string } | null;
        showMCs: { mc: { name: string; aliasName: string } }[];
      } | null;
    }[];
  }) | null> {
    return this.prisma.task.findFirst({
      where: { uid, deletedAt: null },
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
          include: {
            show: {
              include: {
                client: {
                  select: {
                    name: true,
                  },
                },
                studioRoom: {
                  select: {
                    name: true,
                  },
                },
                showMCs: {
                  where: { deletedAt: null },
                  include: {
                    mc: {
                      select: {
                        name: true,
                        aliasName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<(Task & {
      template: { uid: string; name: string } | null;
      snapshot: { schema: unknown; version: number } | null;
      assignee: { uid: string; name: string } | null;
      targets: {
        show: {
          uid: string;
          name: string;
          startTime: Date;
          endTime: Date;
          client: { name: string } | null;
          studioRoom: { name: string } | null;
          showMCs: { mc: { name: string; aliasName: string } }[];
        } | null;
      }[];
    }) | null>;
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
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const task = await tx.task.update({
        where,
        data: { deletedAt: now },
      });

      await tx.taskTarget.updateMany({
        where: {
          taskId: task.id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
        },
      });

      return task;
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
      has_assignee,
      has_due_date,
      due_date_from,
      due_date_to,
      show_start_from,
      show_start_to,
      studio_name,
      client_name,
      assignee_name,
      show_name,
      search,
      reference_id,
      sort,
      client_id,
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

    // /me/tasks is always scoped to the authenticated assigneeId.
    // `has_assignee=true` is therefore a no-op, while `has_assignee=false`
    // is impossible under this scope and should return an empty page.
    if (has_assignee === false) {
      return { items: [], total: 0 };
    }

    if (has_due_date === false) {
      where.dueDate = null;
    } else if (has_due_date === true) {
      if (due_date_from || due_date_to) {
        where.dueDate = {};
        if (due_date_from)
          where.dueDate.gte = new Date(due_date_from);
        if (due_date_to)
          where.dueDate.lte = new Date(due_date_to);
      } else {
        where.dueDate = { not: null };
      }
    } else if (due_date_from || due_date_to) {
      where.dueDate = {};
      if (due_date_from)
        where.dueDate.gte = new Date(due_date_from);
      if (due_date_to)
        where.dueDate.lte = new Date(due_date_to);
    }

    if (show_start_from || show_start_to) {
      const showStartTimeFilter: Prisma.DateTimeFilter = {};
      if (show_start_from)
        showStartTimeFilter.gte = new Date(show_start_from);
      if (show_start_to)
        showStartTimeFilter.lte = new Date(show_start_to);

      where.targets = {
        some: {
          targetType: 'SHOW',
          deletedAt: null,
          // TODO: normalize these bounds with studio timezone at query construction level.
          show: {
            startTime: showStartTimeFilter,
          },
        },
      };
    }

    if (studio_name) {
      const studioFilter: Prisma.TaskWhereInput = {
        studio: {
          name: { contains: studio_name, mode: 'insensitive' },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, studioFilter];
    }

    if (client_name) {
      const clientNameFilter: Prisma.TaskWhereInput = {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              client: {
                name: { contains: client_name, mode: 'insensitive' },
              },
            },
          },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, clientNameFilter];
    }

    if (assignee_name) {
      const assigneeNameFilter: Prisma.TaskWhereInput = {
        assignee: {
          name: { contains: assignee_name, mode: 'insensitive' },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, assigneeNameFilter];
    }

    if (show_name) {
      const showNameFilter: Prisma.TaskWhereInput = {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              name: { contains: show_name, mode: 'insensitive' },
            },
          },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, showNameFilter];
    }

    if (client_id) {
      const clientFilter: Prisma.TaskWhereInput = {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              client: {
                uid: client_id,
              },
            },
          },
        },
      };

      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, clientFilter];
    }

    if (search) {
      where.OR = [
        { uid: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { assignee: { uid: { contains: search, mode: 'insensitive' } } },
        { assignee: { name: { contains: search, mode: 'insensitive' } } },
        {
          targets: {
            some: {
              targetType: 'SHOW',
              deletedAt: null,
              show: {
                uid: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
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

    if (reference_id) {
      const referenceFilter: Prisma.TaskWhereInput = {
        OR: [
          { assignee: { uid: { contains: reference_id, mode: 'insensitive' } } },
          {
            targets: {
              some: {
                targetType: 'SHOW',
                deletedAt: null,
                show: {
                  uid: { contains: reference_id, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      };

      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, referenceFilter];
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
            include: {
              show: {
                include: {
                  client: {
                    select: {
                      name: true,
                    },
                  },
                  studioRoom: {
                    select: {
                      name: true,
                    },
                  },
                  showMCs: {
                    where: { deletedAt: null },
                    include: {
                      mc: {
                        select: {
                          name: true,
                          aliasName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  async findTasks(query: ListMyTasksQueryTransformed) {
    const {
      status,
      task_type,
      has_assignee,
      has_due_date,
      due_date_from,
      due_date_to,
      show_start_from,
      show_start_to,
      studio_name,
      client_name,
      assignee_name,
      show_name,
      search,
      reference_id,
      sort,
      studio_id,
      client_id,
      page,
      limit,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
    };

    if (studio_id) {
      where.studio = { uid: studio_id };
    }

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (task_type) {
      where.type = Array.isArray(task_type) ? { in: task_type } : task_type;
    }

    if (has_assignee === true) {
      where.assigneeId = { not: null };
    } else if (has_assignee === false) {
      where.assigneeId = null;
    }

    if (has_due_date === false) {
      where.dueDate = null;
    } else if (has_due_date === true) {
      if (due_date_from || due_date_to) {
        where.dueDate = {};
        if (due_date_from)
          where.dueDate.gte = new Date(due_date_from);
        if (due_date_to)
          where.dueDate.lte = new Date(due_date_to);
      } else {
        where.dueDate = { not: null };
      }
    } else if (due_date_from || due_date_to) {
      where.dueDate = {};
      if (due_date_from)
        where.dueDate.gte = new Date(due_date_from);
      if (due_date_to)
        where.dueDate.lte = new Date(due_date_to);
    }

    if (show_start_from || show_start_to) {
      const showStartTimeFilter: Prisma.DateTimeFilter = {};
      if (show_start_from)
        showStartTimeFilter.gte = new Date(show_start_from);
      if (show_start_to)
        showStartTimeFilter.lte = new Date(show_start_to);

      where.targets = {
        some: {
          targetType: 'SHOW',
          deletedAt: null,
          show: {
            startTime: showStartTimeFilter,
          },
        },
      };
    }

    if (studio_name) {
      const studioFilter: Prisma.TaskWhereInput = {
        studio: {
          name: { contains: studio_name, mode: 'insensitive' },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, studioFilter];
    }

    if (client_name) {
      const clientNameFilter: Prisma.TaskWhereInput = {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              client: {
                name: { contains: client_name, mode: 'insensitive' },
              },
            },
          },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, clientNameFilter];
    }

    if (assignee_name) {
      const assigneeNameFilter: Prisma.TaskWhereInput = {
        assignee: {
          name: { contains: assignee_name, mode: 'insensitive' },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, assigneeNameFilter];
    }

    if (show_name) {
      const showNameFilter: Prisma.TaskWhereInput = {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              name: { contains: show_name, mode: 'insensitive' },
            },
          },
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, showNameFilter];
    }

    if (client_id) {
      const clientFilter: Prisma.TaskWhereInput = {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              client: {
                uid: client_id,
              },
            },
          },
        },
      };

      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, clientFilter];
    }

    if (search) {
      where.OR = [
        { uid: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { assignee: { uid: { contains: search, mode: 'insensitive' } } },
        { assignee: { name: { contains: search, mode: 'insensitive' } } },
        {
          targets: {
            some: {
              targetType: 'SHOW',
              deletedAt: null,
              show: {
                uid: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
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

    if (reference_id) {
      const referenceFilter: Prisma.TaskWhereInput = {
        OR: [
          { assignee: { uid: { contains: reference_id, mode: 'insensitive' } } },
          {
            targets: {
              some: {
                targetType: 'SHOW',
                deletedAt: null,
                show: {
                  uid: { contains: reference_id, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      };

      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, referenceFilter];
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
            include: {
              show: {
                include: {
                  client: {
                    select: {
                      name: true,
                    },
                  },
                  studioRoom: {
                    select: {
                      name: true,
                    },
                  },
                  showMCs: {
                    where: { deletedAt: null },
                    include: {
                      mc: {
                        select: {
                          name: true,
                          aliasName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  async reserveMaterialAssetUploadVersion(taskUid: string, fieldKey: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
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

      await tx.task.update({
        where: {
          id: task.id,
        },
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
    });
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
    data: {
      snapshotId: bigint;
      status: TaskStatus;
      version: number;
      dueDate: Date;
      type: TaskType;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<Task> {
    return this.prisma.task.update({
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
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { uid: taskUid, deletedAt: null },
        select: { id: true },
      });

      if (!task) {
        return null;
      }

      const currentShowTarget = await tx.taskTarget.findFirst({
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

      const existingTargetForShow = await tx.taskTarget.findFirst({
        where: {
          taskId: task.id,
          targetType: 'SHOW',
          targetId: showId,
        },
        select: { id: true },
      });

      if (existingTargetForShow) {
        if (existingTargetForShow.id !== currentShowTarget.id) {
          await tx.taskTarget.updateMany({
            where: {
              taskId: task.id,
              targetType: 'SHOW',
              deletedAt: null,
              id: { not: existingTargetForShow.id },
            },
            data: { deletedAt: new Date() },
          });
        }

        await tx.taskTarget.update({
          where: { id: existingTargetForShow.id },
          data: {
            deletedAt: null,
            targetId: showId,
            showId,
          },
        });
      } else {
        await tx.taskTarget.update({
          where: { id: currentShowTarget.id },
          data: {
            targetId: showId,
            showId,
            deletedAt: null,
          },
        });
      }

      return tx.task.update({
        where: { id: task.id },
        data: {
          studioId,
          dueDate,
        },
      });
    });
  }
}
