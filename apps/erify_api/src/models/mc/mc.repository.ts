import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { MC, Prisma } from '@prisma/client';

import type { CreateMcPayload, UpdateMcPayload } from './schemas/mc.schema';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { expandCreatorUidCandidates } from '@/models/creator/creator-uid.util';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class McRepository extends BaseRepository<
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
      where: { uid: { in: uidCandidates }, deletedAt: null } as Prisma.MCWhereInput,
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
   * Create MC with optional user relation.
   */
  async createMc(payload: CreateMcPayload & { uid: string }): Promise<MC> {
    const data: Prisma.MCCreateInput = {
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
   * Update MC by UID with optional user relation changes.
   */
  async updateByUid(uid: string, payload: UpdateMcPayload): Promise<MC> {
    const existing = await this.findByUid(uid);
    const data: Prisma.MCUpdateInput = {};

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

  /**
   * Find MCs by their UIDs (domain-level, ignores deleted).
   */
  async findByUids(uids: string[]): Promise<MC[]> {
    const uidCandidates = Array.from(
      new Set(uids.flatMap((uid) => expandCreatorUidCandidates(uid))),
    );
    return this.delegate.findMany({
      where: { uid: { in: uidCandidates }, deletedAt: null },
    });
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
