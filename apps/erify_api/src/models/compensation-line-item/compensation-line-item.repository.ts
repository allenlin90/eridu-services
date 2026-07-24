import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  CompensationItemType,
  CompensationLineItem,
  CompensationLineItemTargetType,
  Prisma,
} from '@prisma/client';

import {
  compensationLineItemDefaultInclude,
  type CompensationLineItemWithRelations,
} from './schemas/compensation-line-item.schema';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';

type RepositoryListQuery = {
  skip: number;
  take: number;
  sort: 'asc' | 'desc';
  includeDeleted: boolean;
  studioId?: string;
  targetType?: CompensationLineItemTargetType;
  targetId?: string;
  itemType?: CompensationItemType;
  createdByUid?: string;
  from?: Date;
  to?: Date;
};

@Injectable()
export class CompensationLineItemRepository extends BaseRepository<
  CompensationLineItem,
  Prisma.CompensationLineItemCreateInput,
  Prisma.CompensationLineItemUpdateInput,
  Prisma.CompensationLineItemWhereInput
> {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(() => txHost.tx.compensationLineItem));
  }

  private get delegate() {
    return this.txHost.tx.compensationLineItem;
  }

  async create(
    data: Prisma.CompensationLineItemCreateInput,
  ): Promise<CompensationLineItemWithRelations> {
    return this.delegate.create({
      data,
      include: compensationLineItemDefaultInclude,
    });
  }

  async findByUidWithRelations(
    uid: string,
    params?: { includeDeleted?: boolean },
  ): Promise<CompensationLineItemWithRelations | null> {
    return this.delegate.findFirst({
      where: {
        uid,
        ...(params?.includeDeleted ? {} : { deletedAt: null }),
      },
      include: compensationLineItemDefaultInclude,
    });
  }

  async findByUidForStudio(params: {
    uid: string;
    studioId: string;
  }): Promise<CompensationLineItemWithRelations | null> {
    return this.delegate.findFirst({
      where: {
        uid: params.uid,
        deletedAt: null,
        studio: { uid: params.studioId },
      },
      include: compensationLineItemDefaultInclude,
    });
  }

  async findPaginated(
    query: RepositoryListQuery,
  ): Promise<{ data: CompensationLineItemWithRelations[]; total: number }> {
    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [{ createdAt: query.sort }, { uid: 'asc' }],
        include: compensationLineItemDefaultInclude,
      }),
      this.delegate.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Batch-fetches active line item amounts for a set of show-creator assignment UIDs.
   * Used by the per-show creator compensation summary to avoid N+1 queries.
   */
  async findActiveAmountsByShowCreatorUids(params: {
    studioId: string;
    showCreatorUids: string[];
  }): Promise<Array<{ showCreatorUid: string; amount: Prisma.Decimal }>> {
    if (params.showCreatorUids.length === 0) {
      return [];
    }

    const rows = await this.delegate.findMany({
      where: {
        deletedAt: null,
        studio: { uid: params.studioId },
        target: {
          targetType: 'SHOW_CREATOR',
          showCreator: { uid: { in: params.showCreatorUids } },
        },
      },
      select: {
        amount: true,
        target: {
          select: {
            showCreator: { select: { uid: true } },
          },
        },
      },
    });

    const result: Array<{ showCreatorUid: string; amount: Prisma.Decimal }> = [];
    for (const row of rows) {
      const uid = row.target?.showCreator?.uid;
      if (uid) {
        result.push({ showCreatorUid: uid, amount: row.amount });
      }
    }
    return result;
  }

  private buildWhere(
    query: RepositoryListQuery,
  ): Prisma.CompensationLineItemWhereInput {
    const where: Prisma.CompensationLineItemWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
    };

    if (query.studioId) {
      where.studio = { uid: query.studioId };
    }

    if (query.itemType) {
      where.itemType = query.itemType;
    }

    if (query.createdByUid) {
      where.createdBy = { uid: query.createdByUid };
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = query.from;
      }
      if (query.to) {
        where.createdAt.lte = query.to;
      }
    }

    const targetFilter = this.buildTargetFilter(query);
    if (targetFilter) {
      where.target = targetFilter;
    }

    return where;
  }

  private buildTargetFilter(
    query: RepositoryListQuery,
  ): Prisma.CompensationLineItemTargetWhereInput | undefined {
    const filter: Prisma.CompensationLineItemTargetWhereInput = {};
    let hasFilter = false;

    if (query.targetType) {
      filter.targetType = query.targetType;
      hasFilter = true;
    }

    if (query.targetId) {
      hasFilter = true;
      Object.assign(filter, this.buildTargetUidFilter(
        query.targetType,
        query.targetId,
      ));
    }

    return hasFilter ? filter : undefined;
  }

  private buildTargetUidFilter(
    targetType: CompensationLineItemTargetType | undefined,
    targetId: string,
  ): Prisma.CompensationLineItemTargetWhereInput {
    if (targetType === 'SHOW') {
      return { show: { uid: targetId } };
    }
    if (targetType === 'SHOW_CREATOR') {
      return { showCreator: { uid: targetId } };
    }
    if (targetType === 'STUDIO_SHIFT') {
      return { studioShift: { uid: targetId } };
    }
    if (targetType === 'STUDIO_SHIFT_BLOCK') {
      return { studioShiftBlock: { uid: targetId } };
    }

    return {
      OR: [
        { show: { uid: targetId } },
        { showCreator: { uid: targetId } },
        { studioShift: { uid: targetId } },
        { studioShiftBlock: { uid: targetId } },
      ],
    };
  }
}
