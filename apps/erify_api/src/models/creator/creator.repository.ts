import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Creator, Prisma } from '@prisma/client';

import { STUDIO_CREATOR_ROSTER_STATE, type StudioCreatorRosterState } from '@eridu/api-types/studio-creators';

import type { CreateCreatorPayload, UpdateCreatorPayload } from './schemas/creator.schema';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CreatorRepository extends BaseRepository<
  Creator,
  Prisma.CreatorCreateInput,
  Prisma.CreatorUpdateInput,
  Prisma.CreatorWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.creator));
  }

  private get delegate() {
    return this.txHost.tx.creator;
  }

  /**
   * Find an Creator by UID with optional type-safe include.
   */
  async findByUid<T extends Prisma.CreatorInclude>(
    uid: string,
    include?: T,
  ): Promise<Prisma.CreatorGetPayload<{ include: T }> | Creator | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null } as Prisma.CreatorWhereInput,
      ...(include && { include }),
    }) as unknown as Promise<Prisma.CreatorGetPayload<{ include: T }> | Creator | null>;
  }

  /**
   * Find an Creator by User UID or Ext ID.
   */
  async findByUserIdentifier(identifier: string): Promise<Creator | null> {
    return this.delegate.findFirst({
      where: {
        deletedAt: null,
        user: {
          OR: [{ uid: identifier }, { extId: identifier }],
          deletedAt: null,
        },
      },
    });
  }

  /**
   * Find Creator by user UID.
   */
  async findByUserUid(userUid: string): Promise<Creator | null> {
    return this.delegate.findFirst({
      where: {
        user: { uid: userUid },
        deletedAt: null,
      },
    });
  }

  /**
   * Create Creator with optional user relation.
   */
  async createCreator(payload: CreateCreatorPayload & { uid: string }): Promise<Creator> {
    const data: Prisma.CreatorCreateInput = {
      uid: payload.uid,
      name: payload.name,
      aliasName: payload.aliasName,
      ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
      ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
      ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
      metadata: payload.metadata ?? {},
      ...(payload.userId && { user: { connect: { uid: payload.userId } } }),
    };

    return this.delegate.create({ data });
  }

  /**
   * Update Creator by UID with optional user relation changes.
   */
  async updateByUid(uid: string, payload: UpdateCreatorPayload): Promise<Creator> {
    const existing = await this.findByUid(uid);
    const data: Prisma.CreatorUpdateInput = {};

    if (payload.name !== undefined)
      data.name = payload.name;
    if (payload.aliasName !== undefined)
      data.aliasName = payload.aliasName;
    if (payload.isBanned !== undefined)
      data.isBanned = payload.isBanned;
    if (payload.defaultRate !== undefined)
      data.defaultRate = payload.defaultRate;
    if (payload.defaultRateType !== undefined)
      data.defaultRateType = payload.defaultRateType;
    if (payload.defaultCommissionRate !== undefined)
      data.defaultCommissionRate = payload.defaultCommissionRate;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.userId !== undefined) {
      data.user = payload.userId
        ? { connect: { uid: payload.userId } }
        : { disconnect: true };
    }

    return this.delegate.update({
      where: {
        uid: existing?.uid ?? uid,
        deletedAt: null,
      },
      data,
    });
  }

  /**
   * Lists creators with pagination and complex filtering.
   */
  async findPaginated(params: {
    skip?: number;
    take?: number;
    name?: string;
    aliasName?: string;
    uid?: string;
    includeDeleted?: boolean;
    includeUser?: boolean;
  }): Promise<{ data: Creator[]; total: number }> {
    const where = this.buildWhereClause(params);
    const delegate = this.delegate;

    const [data, total] = await Promise.all([
      delegate.findMany({
        skip: params.skip,
        take: params.take,
        where,
        ...(params.includeUser && { include: { user: true } }),
      }),
      delegate.count({ where }),
    ]);

    return { data, total };
  }

  async findMany(params: {
    where?: Prisma.CreatorWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<Creator[]> {
    return this.delegate.findMany(params);
  }

  /**
   * Find creators by their UIDs (domain-level, ignores deleted).
   */
  async findByUids(uids: string[]): Promise<Creator[]> {
    return this.delegate.findMany({
      where: { uid: { in: uids }, deletedAt: null },
    });
  }

  async findCatalogForStudio(params: {
    studioUid: string;
    search?: string;
    includeRostered?: boolean;
    limit?: number;
  }): Promise<Array<{
      uid: string;
      name: string;
      aliasName: string;
      isRostered: boolean;
      rosterState: StudioCreatorRosterState;
    }>> {
    const search = params.search?.trim();
    const where: Prisma.CreatorWhereInput = {
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
      ...(!params.includeRostered && {
        studioCreators: {
          none: {
            deletedAt: null,
            studio: {
              uid: params.studioUid,
              deletedAt: null,
            },
          },
        },
      }),
    };

    const creators = await this.delegate.findMany({
      where,
      take: params.limit ?? 50,
      orderBy: [{ name: 'asc' }],
      select: {
        uid: true,
        name: true,
        aliasName: true,
        studioCreators: {
          where: {
            deletedAt: null,
            studio: {
              uid: params.studioUid,
              deletedAt: null,
            },
          },
          select: {
            id: true,
            isActive: true,
          },
          take: 1,
        },
      },
    });

    return creators.map((creator) => ({
      uid: creator.uid,
      name: creator.name,
      aliasName: creator.aliasName,
      isRostered: creator.studioCreators.length > 0,
      rosterState: creator.studioCreators.length === 0
        ? STUDIO_CREATOR_ROSTER_STATE.NONE
        : creator.studioCreators[0]?.isActive
          ? STUDIO_CREATOR_ROSTER_STATE.ACTIVE
          : STUDIO_CREATOR_ROSTER_STATE.INACTIVE,
    }));
  }

  async findAvailableForStudioWindow(params: {
    studioUid: string;
    dateFrom: Date;
    dateTo: Date;
    search?: string;
    limit?: number;
  }): Promise<Array<{
      uid: string;
      name: string;
      aliasName: string;
    }>> {
    // TODO(phase-5): restore strict overlap-based availability constraints.
    // Current behavior is intentionally loose to support broad creator discovery in mapping flows.
    return this.delegate.findMany({
      where: {
        deletedAt: null,
        NOT: {
          studioCreators: {
            some: {
              deletedAt: null,
              isActive: false,
              studio: {
                uid: params.studioUid,
                deletedAt: null,
              },
            },
          },
        },
        ...(params.search
          ? {
              OR: [
                { uid: { contains: params.search, mode: 'insensitive' } },
                { name: { contains: params.search, mode: 'insensitive' } },
                { aliasName: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: params.limit ?? 50,
      orderBy: [{ name: 'asc' }],
      select: {
        uid: true,
        name: true,
        aliasName: true,
      },
    });
  }

  private buildWhereClause(params: {
    name?: string;
    aliasName?: string;
    uid?: string;
    includeDeleted?: boolean;
  }): Prisma.CreatorWhereInput {
    const where: Prisma.CreatorWhereInput = {};

    if (!params.includeDeleted) {
      where.deletedAt = null;
    }

    if (params.name) {
      where.name = {
        contains: params.name,
        mode: 'insensitive',
      };
    }

    if (params.uid) {
      where.uid = {
        contains: params.uid,
        mode: 'insensitive',
      };
    }

    if (params.aliasName) {
      where.aliasName = {
        contains: params.aliasName,
        mode: 'insensitive',
      };
    }

    return where;
  }
}
