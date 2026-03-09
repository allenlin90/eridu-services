import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, StudioShift } from '@prisma/client';

import type { BlocksReplacePayload } from './schemas/studio-shift.schema';

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
  private static readonly OPERATIONAL_DAY_START_HOUR_UTC = 6;

  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.studioShift));
  }

  private get delegate() {
    return this.txHost.tx.studioShift;
  }

  async createShift(data: Prisma.StudioShiftCreateInput): Promise<StudioShiftWithRelations> {
    return this.delegate.create({
      data,
      include: defaultShiftInclude,
    });
  }

  async findByUidInStudio(studioUid: string, uid: string): Promise<StudioShiftWithRelations | null> {
    return this.delegate.findFirst({
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
    data: Omit<Prisma.StudioShiftUpdateInput, 'blocks'>,
    existingId?: bigint,
    blocksPayload?: BlocksReplacePayload,
  ): Promise<StudioShiftWithRelations | null> {
    const targetId = existingId ?? (await this.findByUidInStudio(studioUid, uid))?.id;
    if (!targetId)
      return null;

    const deletedAt = new Date();
    const blocksUpdate: Prisma.StudioShiftUpdateInput['blocks'] = blocksPayload
      ? {
          updateMany: {
            where: { deletedAt: null, uid: { notIn: blocksPayload.retainedUids } },
            data: { deletedAt },
          },
          upsert: blocksPayload.blocksToUpsert.map((block) => ({
            where: { uid: block.uid },
            update: { startTime: block.startTime, endTime: block.endTime, metadata: block.metadata as Prisma.InputJsonValue, deletedAt: null },
            create: { uid: block.uid, startTime: block.startTime, endTime: block.endTime, metadata: block.metadata as Prisma.InputJsonValue },
          })),
        }
      : undefined;

    return this.delegate.update({
      where: { id: targetId },
      data: { ...data, ...(blocksUpdate && { blocks: blocksUpdate }) },
      include: defaultShiftInclude,
    });
  }

  async softDeleteInStudio(studioUid: string, uid: string, existingId?: bigint): Promise<StudioShiftWithRelations | null> {
    const targetId = existingId ?? (await this.findByUidInStudio(studioUid, uid))?.id;
    if (!targetId)
      return null;

    const deletedAt = new Date();

    return this.delegate.update({
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
      this.delegate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        include: defaultShiftInclude,
      }),
      this.delegate.count({ where }),
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
      this.delegate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        include: defaultShiftInclude,
      }),
      this.delegate.count({ where }),
    ]);

    return { data, total };
  }

  async findByStudioAndBlockWindow(params: {
    studioUid: string;
    start: Date;
    end: Date;
    includeCancelled?: boolean;
  }): Promise<StudioShiftWithRelations[]> {
    return this.delegate.findMany({
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

    return this.delegate.findFirst({
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
    const activeBlock = await this.txHost.tx.studioShiftBlock.findFirst({
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

  /**
   * Find all shifts for a studio whose date falls within the given window.
   * Used for economics cost aggregation.
   */
  async findByShowWindow(studioId: bigint, dateFrom: Date, dateTo: Date): Promise<StudioShift[]> {
    const fromOperationalDate = this.toOperationalDate(dateFrom);
    const toOperationalDate = this.toOperationalDate(dateTo);

    return this.delegate.findMany({
      where: {
        studioId,
        deletedAt: null,
        status: { not: 'CANCELLED' },
        date: { gte: fromOperationalDate, lte: toOperationalDate },
      },
    });
  }

  /**
   * Maps a timestamp to the corresponding operational day date.
   * Operational day starts at 06:00 UTC and ends at 05:59 UTC next calendar day.
   */
  private toOperationalDate(value: Date): Date {
    const date = new Date(value);
    if (date.getUTCHours() < StudioShiftRepository.OPERATIONAL_DAY_START_HOUR_UTC) {
      date.setUTCDate(date.getUTCDate() - 1);
    }
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
