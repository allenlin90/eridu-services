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
    existingId?: bigint,
  ): Promise<StudioShiftWithRelations | null> {
    const targetId = existingId ?? (await this.findByUidInStudio(studioUid, uid))?.id;
    if (!targetId)
      return null;

    return this.prisma.studioShift.update({
      where: { id: targetId },
      data,
      include: defaultShiftInclude,
    });
  }

  async softDeleteInStudio(studioUid: string, uid: string, existingId?: bigint): Promise<StudioShiftWithRelations | null> {
    const targetId = existingId ?? (await this.findByUidInStudio(studioUid, uid))?.id;
    if (!targetId)
      return null;

    const deletedAt = new Date();

    return this.prisma.studioShift.update({
      where: { id: targetId },
      data: {
        deletedAt,
        blocks: {
          updateMany: {
            where: { deletedAt: null },
            data: { deletedAt },
          },
        },
      },
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

  async findPaginatedForUser(params: {
    userUid: string;
    studioUid?: string;
    skip: number;
    take: number;
    uid?: string;
    dateFrom?: Date;
    dateTo?: Date;
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    isDutyManager?: boolean;
    includeDeleted?: boolean;
  }): Promise<{ data: StudioShiftWithRelations[]; total: number }> {
    const where: Prisma.StudioShiftWhereInput = {
      user: {
        uid: params.userUid,
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      },
      ...(params.includeDeleted ? {} : { deletedAt: null }),
      ...(params.studioUid
        ? {
            studio: {
              uid: params.studioUid,
              ...(params.includeDeleted ? {} : { deletedAt: null }),
            },
          }
        : {}),
    };

    if (params.uid) {
      where.uid = {
        contains: params.uid,
        mode: 'insensitive',
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

  async findByStudioAndBlockWindow(params: {
    studioUid: string;
    start: Date;
    end: Date;
    includeCancelled?: boolean;
  }): Promise<StudioShiftWithRelations[]> {
    return this.prisma.studioShift.findMany({
      where: {
        studio: {
          uid: params.studioUid,
          deletedAt: null,
        },
        deletedAt: null,
        ...(params.includeCancelled ? {} : { status: { not: 'CANCELLED' } }),
        blocks: {
          some: {
            deletedAt: null,
            startTime: { lt: params.end },
            endTime: { gt: params.start },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: true,
        studio: true,
        blocks: {
          where: {
            deletedAt: null,
            startTime: { lt: params.end },
            endTime: { gt: params.start },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }

  async findOverlappingShift(params: {
    studioUid: string;
    userUid: string;
    blocks: Array<{ startTime: Date; endTime: Date }>;
    excludeShiftUid?: string;
  }): Promise<StudioShiftWithRelations | null> {
    if (params.blocks.length === 0) {
      return null;
    }

    return this.prisma.studioShift.findFirst({
      where: {
        studio: { uid: params.studioUid, deletedAt: null },
        user: { uid: params.userUid, deletedAt: null },
        deletedAt: null,
        status: { not: 'CANCELLED' },
        ...(params.excludeShiftUid ? { uid: { not: params.excludeShiftUid } } : {}),
        OR: params.blocks.map((block) => ({
          blocks: {
            some: {
              deletedAt: null,
              startTime: { lt: block.endTime },
              endTime: { gt: block.startTime },
            },
          },
        })),
      },
      include: defaultShiftInclude,
    });
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
