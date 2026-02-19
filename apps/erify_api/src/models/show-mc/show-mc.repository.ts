import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowMC } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type ShowMCWithIncludes<T extends Prisma.ShowMCInclude> =
  Prisma.ShowMCGetPayload<{
    include: T;
  }>;

// Custom model wrapper that implements IBaseModel with ShowMCWhereInput

@Injectable()
export class ShowMcRepository extends BaseRepository<
  ShowMC,
  Prisma.ShowMCCreateInput,
  Prisma.ShowMCUpdateInput,
  Prisma.ShowMCWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.showMC));
  }

  private get delegate() {
    return this.txHost.tx.showMC;
  }

  async findByUid<T extends Prisma.ShowMCInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T> | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findPaginated(params: {
    skip?: number;
    take?: number;
    showId?: bigint;
    mcId?: bigint;
    includeDeleted?: boolean;
    orderBy?: Prisma.ShowMCOrderByWithRelationInput;
  }): Promise<{ data: ShowMC[]; total: number }> {
    const { skip, take, showId, mcId, includeDeleted, orderBy } = params;

    const where: Prisma.ShowMCWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (showId) {
      where.showId = showId;
    }

    if (mcId) {
      where.mcId = mcId;
    }

    const delegate = this.delegate;

    const [data, total] = await Promise.all([
      delegate.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          show: true,
          mc: true,
        },
      }),
      delegate.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.ShowMCCreateInput, include?: Record<string, any>): Promise<ShowMC> {
    return this.delegate.create({ data, ...(include && { include }) });
  }

  async update(where: Prisma.ShowMCWhereUniqueInput, data: Prisma.ShowMCUpdateInput, include?: Record<string, any>): Promise<ShowMC> {
    return this.delegate.update({ where, data, ...(include && { include }) });
  }

  async updateMany(where: Prisma.ShowMCWhereInput, data: Prisma.ShowMCUpdateManyMutationInput): Promise<Prisma.BatchPayload> {
    return this.delegate.updateMany({ where, data });
  }

  async softDelete(where: Prisma.ShowMCWhereUniqueInput): Promise<ShowMC> {
    return this.delegate.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async restore(where: Prisma.ShowMCWhereUniqueInput): Promise<ShowMC> {
    return this.delegate.update({
      where,
      data: { deletedAt: null },
    });
  }

  async findMany(params: {
    where?: Prisma.ShowMCWhereInput;
    include?: Prisma.ShowMCInclude;
  }): Promise<ShowMC[]> {
    return this.delegate.findMany(params);
  }

  /**
   * Creates a ShowMC assignment by internal IDs (domain-level).
   * Builds Prisma relation syntax internally.
   */
  async createAssignment(params: {
    uid: string;
    showId: bigint;
    mcId: bigint;
    note?: string | null;
    metadata?: object;
  }): Promise<ShowMC> {
    return this.delegate.create({
      data: {
        uid: params.uid,
        show: { connect: { id: params.showId } },
        mc: { connect: { id: params.mcId } },
        note: params.note ?? null,
        metadata: params.metadata ?? {},
      },
    });
  }

  /**
   * Restores a soft-deleted ShowMC assignment and updates its fields, identified by internal ID.
   */
  async restoreAndUpdateAssignment(id: bigint, params: {
    note?: string | null;
    metadata?: object;
  }): Promise<ShowMC> {
    return this.delegate.update({
      where: { id },
      data: {
        note: params.note ?? null,
        metadata: params.metadata ?? {},
        deletedAt: null,
      },
    });
  }

  /**
   * Soft-deletes all ShowMC records for a given show (domain-level).
   */
  async softDeleteAllByShowId(showId: bigint): Promise<void> {
    await this.delegate.updateMany({
      where: { showId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft-deletes ShowMC records by internal MC IDs for a given show (domain-level).
   */
  async softDeleteByMcIds(showId: bigint, mcIds: bigint[]): Promise<void> {
    await this.delegate.updateMany({
      where: { showId, mcId: { in: mcIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
