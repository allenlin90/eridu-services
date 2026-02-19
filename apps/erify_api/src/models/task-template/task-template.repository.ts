import { Injectable } from '@nestjs/common';
import { Prisma, TaskTemplate } from '@prisma/client';

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
}
