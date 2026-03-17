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
