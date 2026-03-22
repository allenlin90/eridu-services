import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus, TaskTemplate } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TaskTemplateRepository extends BaseRepository<
  TaskTemplate,
  Prisma.TaskTemplateCreateInput,
  Prisma.TaskTemplateUpdateInput,
  Prisma.TaskTemplateWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.taskTemplate));
  }

  async findByUid(
    uid: string,
    include?: Prisma.TaskTemplateInclude,
  ): Promise<TaskTemplate | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TaskTemplateWhereInput;
    orderBy?: Prisma.TaskTemplateOrderByWithRelationInput;
    include?: Prisma.TaskTemplateInclude;
  }): Promise<TaskTemplate[]> {
    const { skip, take, where, orderBy, include } = params || {};
    return this.model.findMany({
      where: { ...where, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async update(
    params: { uid: string; studioUid?: string },
    data: Prisma.TaskTemplateUpdateInput,
    include?: Prisma.TaskTemplateInclude,
  ): Promise<TaskTemplate> {
    const { uid, studioUid } = params;
    const where: Prisma.TaskTemplateWhereUniqueInput = {
      uid,
      ...(studioUid && { studio: { uid: studioUid } }),
    };

    return this.prisma.taskTemplate.update({
      where: { ...where, deletedAt: null },
      data,
      ...(include && { include }),
    });
  }

  async updateWithVersionCheck(
    params: { uid: string; studioUid?: string; version?: number },
    data: Prisma.TaskTemplateUpdateInput,
    include?: Prisma.TaskTemplateInclude,
  ): Promise<TaskTemplate> {
    const { uid, studioUid, version } = params;

    const where: Prisma.TaskTemplateWhereUniqueInput & { version?: number } = {
      uid,
      ...(version !== undefined && { version }),
      ...(studioUid && { studio: { uid: studioUid } }),
    };

    try {
      return await this.prisma.taskTemplate.update({
        where: { ...where, deletedAt: null },
        data,
        ...(include && { include }),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR.RecordNotFound && version) {
          const existing = await this.findOne({ uid, deletedAt: null });

          if (!existing) {
            throw error;
          }

          throw new VersionConflictError(
            'Task template version is outdated',
            version,
            existing.version,
          );
        }
      }
      throw error;
    }
  }

  async findPaginated(params: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    includeDeleted?: boolean;
    studioUid?: string;
    orderBy?: 'asc' | 'desc';
  }): Promise<{ data: TaskTemplate[]; total: number }> {
    const { skip, take, name, uid, includeDeleted, studioUid, orderBy } = params;

    const where: Prisma.TaskTemplateWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (uid) {
      where.uid = {
        contains: uid,
        mode: 'insensitive',
      };
    }

    if (studioUid) {
      where.studio = { uid: studioUid };
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        where,
        orderBy: orderBy ? { createdAt: orderBy } : undefined,
      }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }

  async softDelete(where: Prisma.TaskTemplateWhereUniqueInput): Promise<TaskTemplate> {
    return this.prisma.taskTemplate.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findPaginatedAdminWithUsage(params: {
    skip?: number;
    take?: number;
    search?: string;
    studioUid?: string;
    studioName?: string;
    taskType?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
    sort?: 'updated_at:desc' | 'updated_at:asc' | 'last_used_at:desc' | 'last_used_at:asc';
  }) {
    const {
      skip,
      take,
      search,
      studioUid,
      studioName,
      taskType,
      isActive,
      includeDeleted,
      sort = 'updated_at:desc',
    } = params;

    const where: Prisma.TaskTemplateWhereInput = {};
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { uid: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (studioUid || studioName) {
      const studioFilter: Prisma.TaskTemplateWhereInput = {
        studio: {
          ...(studioUid ? { uid: studioUid } : {}),
          ...(studioName ? { name: { contains: studioName, mode: 'insensitive' } } : {}),
        },
      };
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, studioFilter];
    }
    if (taskType) {
      where.currentSchema = {
        path: ['metadata', 'task_type'],
        equals: taskType,
      };
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy = sort.startsWith('updated_at')
      ? ({ updatedAt: sort.endsWith(':asc') ? 'asc' : 'desc' } as Prisma.TaskTemplateOrderByWithRelationInput)
      : ({ updatedAt: 'desc' } as Prisma.TaskTemplateOrderByWithRelationInput);

    const [templates, total] = await Promise.all([
      this.prisma.taskTemplate.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          uid: true,
          name: true,
          description: true,
          isActive: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          studio: {
            select: {
              uid: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.taskTemplate.count({ where }),
    ]);

    if (templates.length === 0) {
      return { data: [], total };
    }

    const templateIds = templates.map((t) => t.id);

    const [totalTaskCounts, activeTaskCounts, lastUsedGroup, taskTypeRows] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['templateId'],
        where: { templateId: { in: templateIds } },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['templateId'],
        where: {
          templateId: { in: templateIds },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['templateId'],
        where: { templateId: { in: templateIds } },
        _max: { createdAt: true },
      }),
      this.prisma.$queryRaw<Array<{ template_id: bigint; task_type: string | null }>>(
        Prisma.sql`
          SELECT
            tt.id AS template_id,
            tt.current_schema #>> '{metadata,task_type}' AS task_type
          FROM task_templates tt
          WHERE tt.id IN (${Prisma.join(templateIds)})
        `,
      ),
    ]);

    const distinctShowRows = await this.prisma.$queryRaw<Array<{ template_id: bigint; show_count: bigint }>>(
      Prisma.sql`
        SELECT
          t.template_id AS template_id,
          COUNT(DISTINCT tt.show_id)::bigint AS show_count
        FROM tasks t
        JOIN task_targets tt ON tt.task_id = t.id
        WHERE t.template_id IN (${Prisma.join(templateIds)})
          AND t.deleted_at IS NULL
          AND tt.deleted_at IS NULL
          AND tt.target_type = 'SHOW'
          AND tt.show_id IS NOT NULL
        GROUP BY t.template_id
      `,
    );

    const totalTaskCountMap = new Map(totalTaskCounts.map((row) => [row.templateId, row._count._all]));
    const activeTaskCountMap = new Map(activeTaskCounts.map((row) => [row.templateId, row._count._all]));
    const lastUsedMap = new Map(lastUsedGroup.map((row) => [row.templateId, row._max.createdAt]));
    const showCountMap = new Map(distinctShowRows.map((row) => [row.template_id, Number(row.show_count)]));
    const taskTypeMap = new Map(taskTypeRows.map((row) => [row.template_id, row.task_type]));

    let data = templates.map((template) => ({
      id: template.uid,
      studio_id: template.studio.uid,
      studio_name: template.studio.name,
      name: template.name,
      description: template.description,
      task_type: taskTypeMap.get(template.id) ?? 'OTHER',
      is_active: template.isActive,
      version: template.version,
      created_at: template.createdAt.toISOString(),
      updated_at: template.updatedAt.toISOString(),
      usage_summary: {
        task_count_total: totalTaskCountMap.get(template.id) ?? 0,
        task_count_active: activeTaskCountMap.get(template.id) ?? 0,
        show_count_active: showCountMap.get(template.id) ?? 0,
        last_used_at: lastUsedMap.get(template.id)?.toISOString() ?? null,
      },
    }));

    if (sort.startsWith('last_used_at')) {
      data = data.sort((a, b) => {
        const av = a.usage_summary.last_used_at ? new Date(a.usage_summary.last_used_at).getTime() : -Infinity;
        const bv = b.usage_summary.last_used_at ? new Date(b.usage_summary.last_used_at).getTime() : -Infinity;
        return sort.endsWith(':asc') ? av - bv : bv - av;
      });
    }

    return { data, total };
  }

  async getTemplateUsageSummary(uid: string) {
    const template = await this.prisma.taskTemplate.findFirst({
      where: { uid },
      select: { id: true },
    });

    if (!template) {
      return null;
    }

    const [taskCountTotal, taskCountActive, lastUsed, distinctShowRows] = await Promise.all([
      this.prisma.task.count({
        where: { templateId: template.id },
      }),
      this.prisma.task.count({
        where: { templateId: template.id, deletedAt: null },
      }),
      this.prisma.task.aggregate({
        where: { templateId: template.id },
        _max: { createdAt: true },
      }),
      this.prisma.$queryRaw<Array<{ show_count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT tt.show_id)::bigint AS show_count
          FROM tasks t
          JOIN task_targets tt ON tt.task_id = t.id
          WHERE t.template_id = ${template.id}
            AND t.deleted_at IS NULL
            AND tt.deleted_at IS NULL
            AND tt.target_type = 'SHOW'
            AND tt.show_id IS NOT NULL
        `,
      ),
    ]);

    return {
      task_count_total: taskCountTotal,
      task_count_active: taskCountActive,
      show_count_active: Number(distinctShowRows[0]?.show_count ?? 0n),
      last_used_at: lastUsed._max.createdAt?.toISOString() ?? null,
    };
  }

  async findTemplateBindings(params: {
    templateUid: string;
    status?: TaskStatus | TaskStatus[];
    showStartFrom?: string;
    showStartTo?: string;
    includeDeleted?: boolean;
    skip?: number;
    take?: number;
  }) {
    const {
      templateUid,
      status,
      showStartFrom,
      showStartTo,
      includeDeleted,
      skip,
      take,
    } = params;

    const where: Prisma.TaskWhereInput = {
      template: { uid: templateUid },
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (showStartFrom || showStartTo) {
      const showTimeFilter: Prisma.DateTimeFilter = {};
      if (showStartFrom)
        showTimeFilter.gte = new Date(showStartFrom);
      if (showStartTo)
        showTimeFilter.lte = new Date(showStartTo);

      where.targets = {
        some: {
          targetType: 'SHOW',
          ...(includeDeleted ? {} : { deletedAt: null }),
          show: {
            startTime: showTimeFilter,
          },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              uid: true,
              name: true,
            },
          },
          targets: {
            where: {
              targetType: 'SHOW',
              ...(includeDeleted ? {} : { deletedAt: null }),
            },
            include: {
              show: {
                select: {
                  uid: true,
                  name: true,
                  startTime: true,
                  endTime: true,
                  studio: {
                    select: {
                      name: true,
                    },
                  },
                  client: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            take: 1,
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    const data = items.map((task) => {
      const show = task.targets[0]?.show ?? null;
      return {
        task: {
          id: task.uid,
          status: task.status,
          type: task.type,
          due_date: task.dueDate?.toISOString() ?? null,
          deleted_at: task.deletedAt?.toISOString() ?? null,
        },
        show: show
          ? {
              id: show.uid,
              name: show.name,
              start_time: show.startTime.toISOString(),
              end_time: show.endTime.toISOString(),
              client_name: show.client?.name ?? null,
              studio_name: show.studio?.name ?? null,
            }
          : null,
        assignee: task.assignee
          ? {
              id: task.assignee.uid,
              name: task.assignee.name,
            }
          : null,
      };
    });

    return { data, total };
  }
}
