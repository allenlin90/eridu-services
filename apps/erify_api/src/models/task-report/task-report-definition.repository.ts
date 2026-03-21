import { Injectable } from '@nestjs/common';
import { Prisma, TaskReportDefinition } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

export type TaskReportDefinitionWithCreator = TaskReportDefinition & {
  createdBy: { uid: string } | null;
};

/**
 * Persistence boundary for task report definitions.
 * Use case: isolate Prisma-level definition CRUD from service logic.
 *
 * This repository extends BaseRepository for standard model operations, while
 * still using Prisma directly for scoped, relation-heavy queries.
 */
@Injectable()
export class TaskReportDefinitionRepository extends BaseRepository<
  TaskReportDefinition,
  Prisma.TaskReportDefinitionCreateInput,
  Prisma.TaskReportDefinitionUpdateInput,
  Prisma.TaskReportDefinitionWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.taskReportDefinition));
  }

  async findPaginated(params: {
    studioUid: string;
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<{
      data: TaskReportDefinitionWithCreator[];
      total: number;
    }> {
    const { studioUid, skip, take, search } = params;

    const where: Prisma.TaskReportDefinitionWhereInput = {
      studio: { uid: studioUid },
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.taskReportDefinition.findMany({
        where,
        skip,
        take,
        orderBy: [
          { updatedAt: 'desc' },
          { uid: 'desc' },
        ],
        include: {
          createdBy: {
            select: {
              uid: true,
            },
          },
        },
      }),
      this.prisma.taskReportDefinition.count({ where }),
    ]);

    return { data, total };
  }

  async findByUidInStudio(
    studioUid: string,
    definitionUid: string,
  ): Promise<TaskReportDefinitionWithCreator | null> {
    return this.prisma.taskReportDefinition.findFirst({
      where: {
        uid: definitionUid,
        deletedAt: null,
        studio: { uid: studioUid },
      },
      include: {
        createdBy: {
          select: {
            uid: true,
          },
        },
      },
    });
  }

  async createInStudio(params: {
    studioUid: string;
    createdById: bigint;
    uid: string;
    name: string;
    description: string | null;
    definition: Prisma.InputJsonValue;
  }): Promise<TaskReportDefinitionWithCreator> {
    return this.prisma.taskReportDefinition.create({
      data: {
        uid: params.uid,
        name: params.name,
        description: params.description,
        definition: params.definition,
        studio: {
          connect: { uid: params.studioUid },
        },
        createdBy: {
          connect: { id: params.createdById },
        },
      },
      include: {
        createdBy: {
          select: {
            uid: true,
          },
        },
      },
    });
  }

  async updateInStudio(params: {
    id: bigint;
    data: Prisma.TaskReportDefinitionUpdateInput;
  }): Promise<TaskReportDefinitionWithCreator> {
    return this.prisma.taskReportDefinition.update({
      where: { id: params.id },
      data: params.data,
      include: {
        createdBy: {
          select: {
            uid: true,
          },
        },
      },
    });
  }

  async softDeleteById(id: bigint) {
    return this.prisma.taskReportDefinition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
