import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Platform, Prisma } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PlatformRepository extends BaseRepository<
  Platform,
  Prisma.PlatformCreateInput,
  Prisma.PlatformUpdateInput,
  Prisma.PlatformWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.platform));
  }

  private get delegate() {
    return this.txHost.tx.platform;
  }

  async findPaginated(params: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    includeDeleted?: boolean;
    orderBy?: Prisma.PlatformOrderByWithRelationInput;
  }): Promise<{ data: Platform[]; total: number }> {
    const where: Prisma.PlatformWhereInput = {};

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

    const delegate = this.delegate;

    const [data, total] = await Promise.all([
      delegate.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy: params.orderBy,
      }),
      delegate.count({ where }),
    ]);

    return { data, total };
  }

  async findMany(params: {
    where?: Prisma.PlatformWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<Platform[]> {
    return this.delegate.findMany(params);
  }

  /**
   * Find Platforms by their UIDs (domain-level, ignores deleted).
   */
  async findByUids(uids: string[]): Promise<Platform[]> {
    return this.delegate.findMany({
      where: { uid: { in: uids }, deletedAt: null },
    });
  }
}
