import { Injectable } from '@nestjs/common';
import { Prisma, TaskTemplate } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

// Custom model wrapper that implements IBaseModel with TaskTemplateWhereInput
class TaskTemplateModelWrapper
implements
    IBaseModel<
      TaskTemplate,
      Prisma.TaskTemplateCreateInput,
      Prisma.TaskTemplateUpdateInput,
      Prisma.TaskTemplateWhereInput
    > {
  constructor(private readonly prismaModel: Prisma.TaskTemplateDelegate) {}

  async create(args: {
    data: Prisma.TaskTemplateCreateInput;
    include?: Record<string, any>;
  }): Promise<TaskTemplate> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.TaskTemplateWhereInput;
    include?: Record<string, any>;
  }): Promise<TaskTemplate | null> {
    return this.prismaModel.findFirst(args);
  }

  async findFirstOrThrow(args: {
    where: Prisma.TaskTemplateWhereInput;
    include?: Record<string, any>;
  }): Promise<TaskTemplate> {
    return this.prismaModel.findFirstOrThrow(args);
  }

  async findMany(args: {
    where?: Prisma.TaskTemplateWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<TaskTemplate[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.TaskTemplateWhereUniqueInput;
    data: Prisma.TaskTemplateUpdateInput;
    include?: Record<string, any>;
  }): Promise<TaskTemplate> {
    return this.prismaModel.update(args);
  }

  async delete(args: { where: Prisma.TaskTemplateWhereUniqueInput }): Promise<TaskTemplate> {
    return this.prismaModel.delete(args);
  }

  async count(args: { where: Prisma.TaskTemplateWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class TaskTemplateRepository extends BaseRepository<
  TaskTemplate,
  Prisma.TaskTemplateCreateInput,
  Prisma.TaskTemplateUpdateInput,
  Prisma.TaskTemplateWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new TaskTemplateModelWrapper(prisma.taskTemplate));
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
    where: Prisma.TaskTemplateWhereUniqueInput,
    data: Prisma.TaskTemplateUpdateInput,
    include?: Prisma.TaskTemplateInclude,
  ): Promise<TaskTemplate> {
    return this.prisma.taskTemplate.update({
      where: { ...where, deletedAt: null },
      data,
      ...(include && { include }),
    });
  }

  async updateWithVersionCheck(
    where: Prisma.TaskTemplateWhereUniqueInput & { version?: number },
    data: Prisma.TaskTemplateUpdateInput,
    include?: Prisma.TaskTemplateInclude,
  ): Promise<TaskTemplate> {
    try {
      return await this.prisma.taskTemplate.update({
        where: { ...where, deletedAt: null },
        data,
        ...(include && { include }),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR.RecordNotFound && where.version) {
          const existing = await this.findOne({ uid: where.uid, deletedAt: null });

          if (!existing) {
            throw error;
          }

          throw new VersionConflictError(
            'Task template version is outdated',
            where.version,
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
