import { Injectable } from '@nestjs/common';
import { Prisma, Schedule } from '@prisma/client';

import type { ScheduleFindPaginatedParams, ScheduleInclude } from './schemas/schedule.schema';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ScheduleRepository extends BaseRepository<
  Schedule,
  Prisma.ScheduleCreateInput,
  Prisma.ScheduleUpdateInput,
  Prisma.ScheduleWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.schedule));
  }

  async findByUid(
    uid: string,
    include?: Prisma.ScheduleInclude,
  ): Promise<Schedule | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async create(
    data: Prisma.ScheduleCreateInput,
    include?: Prisma.ScheduleInclude,
  ): Promise<Schedule> {
    return this.prisma.schedule.create({
      data,
      ...(include && { include }),
    });
  }

  async update(
    where: Prisma.ScheduleWhereUniqueInput,
    data: Prisma.ScheduleUpdateInput,
    include?: Prisma.ScheduleInclude,
  ): Promise<Schedule> {
    return this.prisma.schedule.update({
      where,
      data,
      ...(include && { include }),
    });
  }

  async findPaginated(params: ScheduleFindPaginatedParams): Promise<{
    schedules: Schedule[];
    total: number;
  }> {
    const {
      skip,
      take,
      client_id,
      status,
      created_by,
      published_by,
      start_date_from,
      start_date_to,
      end_date_from,
      end_date_to,
      name,
      client_name,
      uid,
      include_deleted,
      order_by,
      order_direction,
    } = params;

    const where: Prisma.ScheduleWhereInput = {};

    if (!include_deleted) {
      where.deletedAt = null;
    }

    if (client_id) {
      const clientIds = Array.isArray(client_id) ? client_id : [client_id];
      where.client = {
        uid: { in: clientIds },
        ...(include_deleted ? {} : { deletedAt: null }),
      };
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      where.status = { in: statuses };
    }

    if (created_by) {
      const createdByUids = Array.isArray(created_by) ? created_by : [created_by];
      where.createdByUser = {
        uid: { in: createdByUids },
        ...(include_deleted ? {} : { deletedAt: null }),
      };
    }

    if (published_by) {
      const publishedByUids = Array.isArray(published_by) ? published_by : [published_by];
      where.publishedByUser = {
        uid: { in: publishedByUids },
        ...(include_deleted ? {} : { deletedAt: null }),
      };
    }

    if (start_date_from || start_date_to) {
      where.startDate = {};
      if (start_date_from)
        where.startDate.gte = new Date(start_date_from);
      if (start_date_to)
        where.startDate.lte = new Date(start_date_to);
    }

    if (end_date_from || end_date_to) {
      where.endDate = {};
      if (end_date_from)
        where.endDate.gte = new Date(end_date_from);
      if (end_date_to)
        where.endDate.lte = new Date(end_date_to);
    }

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (client_name) {
      where.client = {
        name: { contains: client_name, mode: 'insensitive' },
        ...(include_deleted ? {} : { deletedAt: null }),
      };
    }

    if (uid) {
      where.uid = { contains: uid, mode: 'insensitive' };
    }

    const fieldMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      start_date: 'startDate',
      end_date: 'endDate',
    };
    const sortField = fieldMap[order_by ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: order_direction ?? 'desc' };

    const [schedules, total] = await Promise.all([
      this.prisma.schedule.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          client: true,
          studio: true,
          createdByUser: true,
          publishedByUser: true,
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return { schedules, total };
  }

  async findByDateRange(
    params: {
      startDate: Date;
      endDate: Date;
      clientIds?: string[];
      status?: string;
      includeDeleted?: boolean;
    },
    include?: ScheduleInclude,
  ): Promise<Schedule[]> {
    const where: Prisma.ScheduleWhereInput = {
      startDate: { lte: params.endDate },
      endDate: { gte: params.startDate },
      ...(params.status && { status: params.status }),
      ...(params.includeDeleted ? {} : { deletedAt: null }),
    };

    if (params.clientIds && params.clientIds.length > 0) {
      where.client = {
        uid: { in: params.clientIds },
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      };
    }

    return this.prisma.schedule.findMany({
      where,
      orderBy: { startDate: 'asc' },
      ...(include && { include }),
    });
  }
}
