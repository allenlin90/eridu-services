import { Injectable } from '@nestjs/common';
import { Prisma, StudioShift } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

const defaultShiftInclude = {
  user: true,
  studio: true,
  blocks: {
    where: { deletedAt: null },
    orderBy: { startTime: 'asc' },
  },
} as const;

export type StudioShiftWithRelations = Prisma.StudioShiftGetPayload<{
  include: typeof defaultShiftInclude;
}>;

@Injectable()
export class StudioShiftRepository extends BaseRepository<
  StudioShift,
  Prisma.StudioShiftCreateInput,
  Prisma.StudioShiftUpdateInput,
  Prisma.StudioShiftWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.studioShift));
  }

  async createShift(data: Prisma.StudioShiftCreateInput): Promise<StudioShiftWithRelations> {
    return this.prisma.studioShift.create({
      data,
      include: defaultShiftInclude,
    });
  }

  async findByUidInStudio(studioUid: string, uid: string): Promise<StudioShiftWithRelations | null> {
    return this.prisma.studioShift.findFirst({
      where: {
        uid,
        studio: { uid: studioUid, deletedAt: null },
        deletedAt: null,
      },
      include: defaultShiftInclude,
    });
  }

  async updateShift(
    studioUid: string,
    uid: string,
    data: Prisma.StudioShiftUpdateInput,
  ): Promise<StudioShiftWithRelations | null> {
    const existing = await this.findByUidInStudio(studioUid, uid);
    if (!existing) {
      return null;
    }

    return this.prisma.studioShift.update({
      where: { id: existing.id },
      data,
      include: defaultShiftInclude,
    });
  }

  async softDeleteInStudio(studioUid: string, uid: string): Promise<StudioShiftWithRelations | null> {
    const existing = await this.findByUidInStudio(studioUid, uid);
    if (!existing) {
      return null;
    }

    return this.prisma.studioShift.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: defaultShiftInclude,
    });
  }

  async findPaginated(params: {
    studioId: string;
    skip: number;
    take: number;
    uid?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    isDutyManager?: boolean;
    includeDeleted?: boolean;
  }): Promise<{ data: StudioShiftWithRelations[]; total: number }> {
    const where: Prisma.StudioShiftWhereInput = {
      studio: {
        uid: params.studioId,
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      },
      ...(params.includeDeleted ? {} : { deletedAt: null }),
    };

    if (params.uid) {
      where.uid = {
        contains: params.uid,
        mode: 'insensitive',
      };
    }

    if (params.userId) {
      where.user = {
        uid: params.userId,
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      };
    }

    if (params.dateFrom || params.dateTo) {
      where.date = {};
      if (params.dateFrom)
        where.date.gte = params.dateFrom;
      if (params.dateTo)
        where.date.lte = params.dateTo;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.isDutyManager !== undefined) {
      where.isDutyManager = params.isDutyManager;
    }

    const [data, total] = await Promise.all([
      this.prisma.studioShift.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        include: defaultShiftInclude,
      }),
      this.prisma.studioShift.count({ where }),
    ]);

    return { data, total };
  }

  async findActiveDutyManager(
    studioUid: string,
    timestamp: Date,
  ): Promise<StudioShiftWithRelations | null> {
    const activeBlock = await this.prisma.studioShiftBlock.findFirst({
      where: {
        deletedAt: null,
        startTime: { lte: timestamp },
        endTime: { gt: timestamp },
        shift: {
          studio: { uid: studioUid, deletedAt: null },
          isDutyManager: true,
          status: 'SCHEDULED',
          deletedAt: null,
        },
      },
      orderBy: { startTime: 'desc' },
      include: {
        shift: {
          include: defaultShiftInclude,
        },
      },
    });

    return activeBlock?.shift ?? null;
  }
}
