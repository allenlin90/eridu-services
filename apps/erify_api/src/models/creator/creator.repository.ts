import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { MC, Prisma } from '@prisma/client';

import type { CreateCreatorPayload, UpdateCreatorPayload } from './schemas/creator.schema';
import {
  expandCreatorUidCandidates,
  isCreatorUid,
} from './creator-uid.util';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CreatorRepository extends BaseRepository<
  MC,
  Prisma.MCCreateInput,
  Prisma.MCUpdateInput,
  Prisma.MCWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.mC));
  }

  private get delegate() {
    return this.txHost.tx.mC;
  }

  /**
   * Find an MC by UID with optional type-safe include.
   */
  async findByUid<T extends Prisma.MCInclude>(
    uid: string,
    include?: T,
  ): Promise<Prisma.MCGetPayload<{ include: T }> | MC | null> {
    const uidCandidates = expandCreatorUidCandidates(uid);
    return this.delegate.findFirst({
      where: {
        uid: { in: uidCandidates },
        deletedAt: null,
      } as Prisma.MCWhereInput,
      ...(include && { include }),
    }) as unknown as Promise<Prisma.MCGetPayload<{ include: T }> | MC | null>;
  }

  /**
   * Find an MC by User UID or Ext ID.
   */
  async findByUserIdentifier(identifier: string): Promise<MC | null> {
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
   * Find MC by user UID.
   */
  async findByUserUid(userUid: string): Promise<MC | null> {
    return this.delegate.findFirst({
      where: {
        user: { uid: userUid },
        deletedAt: null,
      },
    });
  }

  /**
   * Create creator with optional user relation.
   */
  async createCreator(payload: CreateCreatorPayload & { uid: string }): Promise<MC> {
    const data: Prisma.MCCreateInput = {
      uid: payload.uid,
      name: payload.name,
      aliasName: payload.aliasName,
      metadata: payload.metadata ?? {},
      ...(payload.userId && { user: { connect: { uid: payload.userId } } }),
      ...(payload.defaultRate !== undefined && { defaultRate: payload.defaultRate }),
      ...(payload.defaultRateType !== undefined && { defaultRateType: payload.defaultRateType }),
      ...(payload.defaultCommissionRate !== undefined && { defaultCommissionRate: payload.defaultCommissionRate }),
    };

    return this.delegate.create({ data });
  }

  /**
   * Update MC by UID with optional user relation changes.
   */
  async updateCreatorByUid(uid: string, payload: UpdateCreatorPayload): Promise<MC> {
    const data: Prisma.MCUpdateInput = {};

    if (payload.name !== undefined)
      data.name = payload.name;
    if (payload.aliasName !== undefined)
      data.aliasName = payload.aliasName;
    if (payload.isBanned !== undefined)
      data.isBanned = payload.isBanned;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;
    if (payload.defaultRate !== undefined)
      data.defaultRate = payload.defaultRate;
    if (payload.defaultRateType !== undefined)
      data.defaultRateType = payload.defaultRateType;
    if (payload.defaultCommissionRate !== undefined)
      data.defaultCommissionRate = payload.defaultCommissionRate;

    if (payload.userId !== undefined) {
      data.user = payload.userId
        ? { connect: { uid: payload.userId } }
        : { disconnect: true };
    }

    return this.delegate.update({
      where: { uid, deletedAt: null },
      data,
    });
  }

  /**
   * Lists MCs with pagination and complex filtering.
   */
  async findPaginated(params: {
    skip?: number;
    take?: number;
    name?: string;
    aliasName?: string;
    uid?: string;
    includeDeleted?: boolean;
    includeUser?: boolean;
  }): Promise<{ data: MC[]; total: number }> {
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
    where?: Prisma.MCWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<MC[]> {
    return this.delegate.findMany(params);
  }

  async findCatalogForStudio(params: {
    studioUid: string;
    search?: string;
    includeRostered?: boolean;
    limit?: number;
  }): Promise<MC[]> {
    const limit = Math.min(params.limit ?? 100, 200);
    const search = params.search?.trim();

    return this.delegate.findMany({
      where: {
        deletedAt: null,
        ...(params.includeRostered
          ? {}
          : {
              studioMcs: {
                none: {
                  deletedAt: null,
                  studio: {
                    uid: params.studioUid,
                    deletedAt: null,
                  },
                },
              },
            }),
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
      orderBy: { name: 'asc' },
      take: limit,
    });
  }

  /**
   * Find MCs by their UIDs (domain-level, ignores deleted).
   */
  async findByUids(uids: string[]): Promise<MC[]> {
    const expandedUids = Array.from(
      new Set(
        uids.flatMap((uid) =>
          isCreatorUid(uid) ? expandCreatorUidCandidates(uid) : [uid],
        ),
      ),
    );
    return this.delegate.findMany({
      where: { uid: { in: expandedUids }, deletedAt: null },
    });
  }

  /**
   * Find MCs not assigned to any show that overlaps the given windows.
   * A show overlaps a window when: show.startTime < window.dateTo AND show.endTime > window.dateFrom.
   */
  async findAvailableMcs(
    windows: { dateFrom: Date; dateTo: Date }[],
    studioUid?: string,
  ): Promise<MC[]> {
    if (windows.length === 0) {
      return this.delegate.findMany({
        where: {
          deletedAt: null,
          ...(studioUid && {
            studioMcs: {
              some: { deletedAt: null, isActive: true, studio: { uid: studioUid, deletedAt: null } },
            },
          }),
        },
      });
    }

    const conflictingMcIds = await this.txHost.tx.showMC.findMany({
      where: {
        deletedAt: null,
        show: {
          deletedAt: null,
          OR: windows.map((w) => ({
            startTime: { lt: w.dateTo },
            endTime: { gt: w.dateFrom },
          })),
        },
      },
      select: { mcId: true },
    });

    const bookedIds = conflictingMcIds.map((r) => r.mcId);

    return this.delegate.findMany({
      where: {
        deletedAt: null,
        ...(studioUid && {
          studioMcs: {
            some: {
              deletedAt: null,
              isActive: true,
              studio: {
                uid: studioUid,
                deletedAt: null,
              },
            },
          },
        }),
        ...(bookedIds.length > 0 && { id: { notIn: bookedIds } }),
      },
    });
  }

  async findAvailableCreators(
    windows: { dateFrom: Date; dateTo: Date }[],
    studioUid?: string,
  ): Promise<MC[]> {
    return this.findAvailableMcs(windows, studioUid);
  }

  private buildWhereClause(params: {
    name?: string;
    aliasName?: string;
    uid?: string;
    includeDeleted?: boolean;
  }): Prisma.MCWhereInput {
    const where: Prisma.MCWhereInput = {};

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

export { CreatorRepository as McRepository };
