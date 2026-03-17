import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { TaskStatus } from '@eridu/api-types/task-management';

import { PrismaService } from '@/prisma/prisma.service';

type TaskReportScopeFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  showStandardId?: string;
  showTypeId?: string;
  showIds?: string[];
  sourceTemplateIds?: string[];
  submittedStatuses: TaskStatus[];
};

export type TaskReportSourceSnapshot = {
  templateUid: string;
  templateName: string;
  snapshotSchema: Prisma.JsonValue;
  taskCount: number;
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
          deletedAt: null,
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
        snapshotSchema: snapshot.schema,
        taskCount: row._count._all,
      }];
    });
  }

  private buildShowWhere(studioUid: string, filters: TaskReportScopeFilters): Prisma.ShowWhereInput {
    const where: Prisma.ShowWhereInput = {
      deletedAt: null,
      studio: { uid: studioUid },
    };

    if (filters.showStandardId) {
      where.showStandard = { uid: filters.showStandardId };
    }

    if (filters.showTypeId) {
      where.showType = { uid: filters.showTypeId };
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
