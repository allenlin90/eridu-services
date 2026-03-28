import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, StudioCreator } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

const studioCreatorRosterInclude = {
  creator: {
    select: {
      uid: true,
      name: true,
      aliasName: true,
    },
  },
} satisfies Prisma.StudioCreatorInclude;

export type StudioCreatorRosterRecord = Prisma.StudioCreatorGetPayload<{
  include: typeof studioCreatorRosterInclude;
}>;

@Injectable()
export class StudioCreatorRepository extends BaseRepository<
  StudioCreator,
  Prisma.StudioCreatorCreateInput,
  Prisma.StudioCreatorUpdateInput,
  Prisma.StudioCreatorWhereInput
> {
  constructor(
    prisma: PrismaService, // only used to seed BaseRepository; all queries go through txHost
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.studioCreator));
  }

  private get delegate() {
    return this.txHost.tx.studioCreator;
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
  ): Promise<{ data: StudioCreatorRosterRecord[]; total: number }> {
    const search = params.search?.trim();
    const where: Prisma.StudioCreatorWhereInput = {
      deletedAt: null,
      studio: {
        uid: studioUid,
        deletedAt: null,
      },
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.defaultRateType !== undefined && {
        defaultRateType: params.defaultRateType,
      }),
      creator: {
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
      },
    };

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        include: studioCreatorRosterInclude,
        orderBy: [
          { isActive: 'desc' },
          { creator: { name: 'asc' } },
        ],
        skip: params.skip,
        take: params.take,
      }),
      this.delegate.count({ where }),
    ]);

    return { data, total };
  }

  async findByStudioUidAndCreatorUid(
    studioUid: string,
    creatorUid: string,
  ): Promise<StudioCreatorRosterRecord | null> {
    return this.delegate.findFirst({
      where: {
        deletedAt: null,
        studio: {
          uid: studioUid,
          deletedAt: null,
        },
        creator: {
          uid: creatorUid,
          deletedAt: null,
        },
      },
      include: studioCreatorRosterInclude,
    });
  }

  async findByStudioUidAndCreatorUids(
    studioUid: string,
    creatorUids: string[],
  ): Promise<StudioCreatorRosterRecord[]> {
    if (creatorUids.length === 0) {
      return [];
    }

    return this.delegate.findMany({
      where: {
        deletedAt: null,
        studio: {
          uid: studioUid,
          deletedAt: null,
        },
        creator: {
          uid: { in: creatorUids },
          deletedAt: null,
        },
      },
      include: studioCreatorRosterInclude,
    });
  }

  async createRosterEntry(payload: {
    uid: string;
    studioUid: string;
    creatorUid: string;
    defaultRate?: string | null;
    defaultRateType?: string | null;
    defaultCommissionRate?: string | null;
    metadata?: object;
  }): Promise<StudioCreatorRosterRecord> {
    return this.delegate.create({
      data: {
        uid: payload.uid,
        studio: { connect: { uid: payload.studioUid } },
        creator: { connect: { uid: payload.creatorUid } },
        ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
        ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
        ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
        metadata: payload.metadata ?? {},
      },
      include: studioCreatorRosterInclude,
    });
  }

  async reactivateRosterEntry(payload: {
    uid: string;
    defaultRate?: string | null;
    defaultRateType?: string | null;
    defaultCommissionRate?: string | null;
    metadata?: object;
  }): Promise<StudioCreatorRosterRecord> {
    return this.delegate.update({
      where: { uid: payload.uid },
      data: {
        isActive: true,
        version: { increment: 1 },
        ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
        ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
        ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
        ...(payload.metadata !== undefined && { metadata: payload.metadata }),
      },
      include: studioCreatorRosterInclude,
    });
  }

  async updateWithVersionCheck(
    studioUid: string,
    creatorUid: string,
    version: number,
    data: {
      defaultRate?: string | null;
      defaultRateType?: string | null;
      defaultCommissionRate?: string | null;
      isActive?: boolean;
      metadata?: object;
    },
  ): Promise<StudioCreatorRosterRecord> {
    const existing = await this.findByStudioUidAndCreatorUid(studioUid, creatorUid);
    if (!existing) {
      throw new Prisma.PrismaClientKnownRequestError(
        'Studio creator not found',
        { code: PRISMA_ERROR.RecordNotFound, clientVersion: 'unknown' },
      );
    }

    const result = await this.delegate.updateMany({
      where: {
        id: existing.id,
        deletedAt: null,
        version,
      },
      data: {
        ...(data.defaultRate !== undefined && { defaultRate: data.defaultRate }),
        ...(data.defaultRateType !== undefined && { defaultRateType: data.defaultRateType }),
        ...(data.defaultCommissionRate !== undefined && { defaultCommissionRate: data.defaultCommissionRate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await this.delegate.findFirst({
        where: { id: existing.id, deletedAt: null },
        select: { version: true },
      });

      throw new VersionConflictError(
        'Studio creator version is outdated',
        version,
        current?.version ?? version,
      );
    }

    const updated = await this.delegate.findFirst({
      where: { id: existing.id, deletedAt: null },
      include: studioCreatorRosterInclude,
    });

    if (!updated) {
      throw new Prisma.PrismaClientKnownRequestError(
        'Studio creator not found after update',
        { code: PRISMA_ERROR.RecordNotFound, clientVersion: 'unknown' },
      );
    }

    return updated;
  }
}
