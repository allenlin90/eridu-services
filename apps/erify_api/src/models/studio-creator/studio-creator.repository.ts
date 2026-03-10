import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, StudioMc } from '@prisma/client';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class StudioCreatorRepository extends BaseRepository<
  StudioMc,
  Prisma.StudioMcCreateInput,
  Prisma.StudioMcUpdateInput,
  Prisma.StudioMcWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.studioMc));
  }

  private get delegate() {
    return this.txHost.tx.studioMc;
  }

  async findByStudioUid(studioUid: string): Promise<(StudioMc & {
    mc: { uid: string; name: string; aliasName: string };
  })[]> {
    return this.delegate.findMany({
      where: {
        deletedAt: null,
        studio: {
          uid: studioUid,
          deletedAt: null,
        },
        mc: {
          deletedAt: null,
        },
      },
      include: {
        mc: {
          select: {
            uid: true,
            name: true,
            aliasName: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { mc: { name: 'asc' } },
      ],
    });
  }

  async findByStudioUidPaginated(
    studioUid: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      isActive?: boolean;
      defaultRateType?: string | null;
    },
  ): Promise<{
      data: (StudioMc & { mc: { uid: string; name: string; aliasName: string } })[];
      total: number;
    }> {
    const search = params.search?.trim();
    const mcWhere: Prisma.MCWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { uid: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { aliasName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const where: Prisma.StudioMcWhereInput = {
      deletedAt: null,
      studio: {
        uid: studioUid,
        deletedAt: null,
      },
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.defaultRateType !== undefined && {
        defaultRateType: params.defaultRateType,
      }),
      mc: mcWhere,
    };

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        include: {
          mc: {
            select: {
              uid: true,
              name: true,
              aliasName: true,
            },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { mc: { name: 'asc' } },
        ],
        skip: params.skip,
        take: params.take,
      }),
      this.delegate.count({ where }),
    ]);

    return { data, total };
  }

  async findOneByStudioAndCreatorUid(
    studioUid: string,
    creatorUid: string,
    includeDeleted = false,
  ): Promise<(StudioMc & {
    mc: { uid: string; name: string; aliasName: string };
  }) | null> {
    return this.delegate.findFirst({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        studio: {
          uid: studioUid,
          deletedAt: null,
        },
        mc: {
          uid: creatorUid,
          deletedAt: null,
        },
      },
      include: {
        mc: {
          select: {
            uid: true,
            name: true,
            aliasName: true,
          },
        },
      },
    });
  }

  async createByUids(
    uid: string,
    studioUid: string,
    mcUid: string,
    payload: {
      defaultRate?: string | null;
      defaultRateType?: string | null;
      defaultCommissionRate?: string | null;
      isActive?: boolean;
      metadata?: Record<string, any>;
    },
  ): Promise<StudioMc & { mc: { uid: string; name: string; aliasName: string } }> {
    return this.delegate.create({
      data: {
        uid,
        studio: { connect: { uid: studioUid } },
        mc: { connect: { uid: mcUid } },
        ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
        ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
        ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        metadata: payload.metadata ?? {},
      },
      include: {
        mc: {
          select: {
            uid: true,
            name: true,
            aliasName: true,
          },
        },
      },
    });
  }

  async updateById(
    id: bigint,
    data: Prisma.StudioMcUpdateInput,
  ): Promise<StudioMc & { mc: { uid: string; name: string; aliasName: string } }> {
    return this.delegate.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
      include: {
        mc: {
          select: {
            uid: true,
            name: true,
            aliasName: true,
          },
        },
      },
    });
  }

  async updateByIdWithVersionCheck(
    id: bigint,
    expectedVersion: number,
    data: Prisma.StudioMcUpdateInput,
  ): Promise<StudioMc & { mc: { uid: string; name: string; aliasName: string } }> {
    const result = await this.delegate.updateMany({
      where: {
        id,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await this.delegate.findFirst({
        where: { id },
        select: { version: true },
      });
      throw new VersionConflictError(
        'Studio roster member was modified by another request',
        expectedVersion,
        current?.version ?? expectedVersion,
      );
    }

    return this.delegate.findFirstOrThrow({
      where: { id },
      include: {
        mc: {
          select: {
            uid: true,
            name: true,
            aliasName: true,
          },
        },
      },
    });
  }

  async softDeleteById(id: bigint): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findDefaultsByStudioIdAndMcIds(
    studioId: bigint,
    mcIds: bigint[],
  ): Promise<Array<Pick<StudioMc, 'mcId' | 'defaultRateType' | 'defaultRate' | 'defaultCommissionRate'>>> {
    if (mcIds.length === 0) {
      return [];
    }

    return this.delegate.findMany({
      where: {
        studioId,
        mcId: { in: mcIds },
        deletedAt: null,
      },
      select: {
        mcId: true,
        defaultRateType: true,
        defaultRate: true,
        defaultCommissionRate: true,
      },
    });
  }
}

export { StudioCreatorRepository as StudioMcRepository };
