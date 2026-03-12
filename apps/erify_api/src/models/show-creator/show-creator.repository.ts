import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowCreator } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type ShowCreatorWithIncludes<T extends Prisma.ShowCreatorInclude> =
  Prisma.ShowCreatorGetPayload<{
    include: T;
  }>;

// Custom model wrapper that implements IBaseModel with ShowCreatorWhereInput

@Injectable()
export class ShowCreatorRepository extends BaseRepository<
  ShowCreator,
  Prisma.ShowCreatorCreateInput,
  Prisma.ShowCreatorUpdateInput,
  Prisma.ShowCreatorWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.showCreator));
  }

  private get delegate() {
    return this.txHost.tx.showCreator;
  }

  async findByUid<T extends Prisma.ShowCreatorInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ShowCreator | ShowCreatorWithIncludes<T> | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findPaginated(params: {
    skip?: number;
    take?: number;
    showId?: bigint;
    creatorId?: bigint;
    includeDeleted?: boolean;
    orderBy?: Prisma.ShowCreatorOrderByWithRelationInput;
  }): Promise<{ data: ShowCreator[]; total: number }> {
    const { skip, take, showId, creatorId, includeDeleted, orderBy } = params;

    const where: Prisma.ShowCreatorWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (showId) {
      where.showId = showId;
    }

    if (creatorId) {
      where.creatorId = creatorId;
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
          creator: true,
        },
      }),
      delegate.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.ShowCreatorCreateInput, include?: Record<string, any>): Promise<ShowCreator> {
    return this.delegate.create({ data, ...(include && { include }) });
  }

  async update(where: Prisma.ShowCreatorWhereUniqueInput, data: Prisma.ShowCreatorUpdateInput, include?: Record<string, any>): Promise<ShowCreator> {
    return this.delegate.update({ where, data, ...(include && { include }) });
  }

  async updateMany(where: Prisma.ShowCreatorWhereInput, data: Prisma.ShowCreatorUpdateManyMutationInput): Promise<Prisma.BatchPayload> {
    return this.delegate.updateMany({ where, data });
  }

  async softDelete(where: Prisma.ShowCreatorWhereUniqueInput): Promise<ShowCreator> {
    return this.delegate.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async restore(where: Prisma.ShowCreatorWhereUniqueInput): Promise<ShowCreator> {
    return this.delegate.update({
      where,
      data: { deletedAt: null },
    });
  }

  async findMany(params: {
    where?: Prisma.ShowCreatorWhereInput;
    include?: Prisma.ShowCreatorInclude;
  }): Promise<ShowCreator[]> {
    return this.delegate.findMany(params);
  }

  /**
   * Creates a ShowCreator assignment by internal IDs (domain-level).
   * Builds Prisma relation syntax internally.
   */
  async createAssignment(params: {
    uid: string;
    showId: bigint;
    creatorId: bigint;
    note?: string | null;
    metadata?: object;
  }): Promise<ShowCreator> {
    return this.delegate.create({
      data: {
        uid: params.uid,
        show: { connect: { id: params.showId } },
        creator: { connect: { id: params.creatorId } },
        note: params.note ?? null,
        metadata: params.metadata ?? {},
      },
    });
  }

  /**
   * Restores a soft-deleted ShowCreator assignment and updates its fields, identified by internal ID.
   */
  async restoreAndUpdateAssignment(id: bigint, params: {
    note?: string | null;
    metadata?: object;
  }): Promise<ShowCreator> {
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
   * Soft-deletes all ShowCreator records for a given show (domain-level).
   */
  async softDeleteAllByShowId(showId: bigint): Promise<void> {
    await this.delegate.updateMany({
      where: { showId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft-deletes ShowCreator records by internal Creator IDs for a given show (domain-level).
   */
  async softDeleteByCreatorIds(showId: bigint, creatorIds: bigint[]): Promise<void> {
    await this.delegate.updateMany({
      where: { showId, creatorId: { in: creatorIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
