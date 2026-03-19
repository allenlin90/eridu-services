import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { TaskStatus } from '@eridu/api-types/task-management';

import { PrismaService } from '@/prisma/prisma.service';

export type TaskReportScopeFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  clientIds?: string[];
  showStandardIds?: string[];
  showTypeIds?: string[];
  showIds?: string[];
  sourceTemplateIds?: string[];
  submittedStatuses: TaskStatus[];
};

export type TaskReportSourceSnapshot = {
  templateUid: string;
  templateName: string;
  snapshotVersion: number;
  snapshotSchema: Prisma.JsonValue;
  taskCount: number;
};

export type TaskReportScopedShow = {
  uid: string;
  name: string;
  externalId: string | null;
  startTime: Date;
  endTime: Date;
  clientName: string | null;
  studioRoomName: string | null;
  showStandardName: string | null;
  showTypeName: string | null;
};

export type TaskReportScopedTask = {
  uid: string;
  updatedAt: Date;
  templateUid: string;
  templateName: string;
  snapshotId: string;
  snapshotSchema: Prisma.JsonValue;
  content: Prisma.JsonValue;
  targetShowUids: string[];
};

/**
 * Analytics read-model for task report scope counting.
 *
 * Intentionally skips BaseRepository — this is a cross-entity aggregation class
 * that runs count queries across both `show` and `task` tables with no single
 * entity owner to parameterize BaseRepository<T> with.
 */
@Injectable()
export class TaskReportScopeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countShowsInScope(studioUid: string, filters: TaskReportScopeFilters): Promise<number> {
    return this.prisma.show.count({
      where: this.buildShowWhere(studioUid, filters),
    });
  }

  async countSubmittedTasksInScope(studioUid: string, filters: TaskReportScopeFilters): Promise<number> {
    const targetShowWhere = this.buildShowWhere(studioUid, filters);

    return this.prisma.task.count({
      where: {
        deletedAt: null,
        studio: { uid: studioUid },
        status: { in: filters.submittedStatuses },
        ...(filters.sourceTemplateIds?.length
          ? {
              template: {
                uid: {
                  in: filters.sourceTemplateIds,
                },
              },
            }
          : {}),
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: targetShowWhere,
          },
        },
      },
    });
  }

  async findSourceSnapshotsInScope(
    studioUid: string,
    filters: TaskReportScopeFilters,
  ): Promise<TaskReportSourceSnapshot[]> {
    const grouped = await this.prisma.task.groupBy({
      by: ['templateId', 'snapshotId'],
      where: {
        deletedAt: null,
        studio: { uid: studioUid },
        status: { in: filters.submittedStatuses },
        templateId: { not: null },
        snapshotId: { not: null },
        ...(filters.sourceTemplateIds?.length
          ? {
              template: {
                uid: {
                  in: filters.sourceTemplateIds,
                },
              },
            }
          : {}),
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: this.buildShowWhere(studioUid, filters),
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    if (grouped.length === 0) {
      return [];
    }

    const templateIds = grouped
      .map((row) => row.templateId)
      .filter((id): id is bigint => id !== null);
    const snapshotIds = grouped
      .map((row) => row.snapshotId)
      .filter((id): id is bigint => id !== null);

    const [templates, snapshots] = await Promise.all([
      this.prisma.taskTemplate.findMany({
        where: {
          id: { in: templateIds },
        },
        select: {
          id: true,
          uid: true,
          name: true,
        },
      }),
      this.prisma.taskTemplateSnapshot.findMany({
        where: {
          id: { in: snapshotIds },
        },
        select: {
          id: true,
          version: true,
          schema: true,
        },
      }),
    ]);

    const templateById = new Map(templates.map((template) => [template.id.toString(), template]));
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id.toString(), snapshot]));

    return grouped.flatMap((row) => {
      if (!row.templateId || !row.snapshotId) {
        return [];
      }

      const template = templateById.get(row.templateId.toString());
      const snapshot = snapshotById.get(row.snapshotId.toString());

      if (!template || !snapshot) {
        return [];
      }

      return [{
        templateUid: template.uid,
        templateName: template.name,
        snapshotVersion: snapshot.version,
        snapshotSchema: snapshot.schema,
        taskCount: row._count._all,
      }];
    });
  }

  async findShowsInScope(studioUid: string, filters: TaskReportScopeFilters): Promise<TaskReportScopedShow[]> {
    const shows = await this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, filters),
      select: {
        uid: true,
        name: true,
        externalId: true,
        startTime: true,
        endTime: true,
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
        showStandard: {
          select: {
            name: true,
          },
        },
        showType: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { startTime: 'desc' },
        { uid: 'desc' },
      ],
    });

    return shows.map((show) => ({
      uid: show.uid,
      name: show.name,
      externalId: show.externalId,
      startTime: show.startTime,
      endTime: show.endTime,
      clientName: show.client?.name ?? null,
      studioRoomName: show.studioRoom?.name ?? null,
      showStandardName: show.showStandard?.name ?? null,
      showTypeName: show.showType?.name ?? null,
    }));
  }

  async findSubmittedTasksInScope(studioUid: string, filters: TaskReportScopeFilters): Promise<TaskReportScopedTask[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        studio: { uid: studioUid },
        status: { in: filters.submittedStatuses },
        templateId: { not: null },
        snapshotId: { not: null },
        ...(filters.sourceTemplateIds?.length
          ? {
              template: {
                uid: {
                  in: filters.sourceTemplateIds,
                },
              },
            }
          : {}),
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: this.buildShowWhere(studioUid, filters),
          },
        },
      },
      select: {
        uid: true,
        updatedAt: true,
        content: true,
        snapshotId: true,
        template: {
          select: {
            uid: true,
            name: true,
          },
        },
        snapshot: {
          select: {
            schema: true,
          },
        },
        targets: {
          where: {
            targetType: 'SHOW',
            deletedAt: null,
            show: this.buildShowWhere(studioUid, filters),
          },
          select: {
            show: {
              select: {
                uid: true,
              },
            },
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { uid: 'desc' },
      ],
    });

    return tasks.flatMap((task) => {
      if (!task.template || !task.snapshot) {
        return [];
      }

      return [{
        uid: task.uid,
        updatedAt: task.updatedAt,
        templateUid: task.template.uid,
        templateName: task.template.name,
        snapshotId: task.snapshotId?.toString() ?? '',
        snapshotSchema: task.snapshot.schema,
        content: task.content,
        targetShowUids: task.targets
          .map((target) => target.show?.uid)
          .filter((uid): uid is string => !!uid),
      }];
    });
  }

  private buildShowWhere(studioUid: string, filters: TaskReportScopeFilters): Prisma.ShowWhereInput {
    const where: Prisma.ShowWhereInput = {
      deletedAt: null,
      studio: { uid: studioUid },
    };

    if (filters.showStandardIds?.length) {
      where.showStandard = { uid: { in: filters.showStandardIds } };
    }

    if (filters.clientIds?.length) {
      where.client = { uid: { in: filters.clientIds } };
    }

    if (filters.showTypeIds?.length) {
      where.showType = { uid: { in: filters.showTypeIds } };
    }

    if (filters.showIds?.length) {
      where.uid = { in: filters.showIds };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.startTime = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    return where;
  }
}
