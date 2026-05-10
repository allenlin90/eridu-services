import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { CompensationLineItem, Prisma } from '@prisma/client';

import {
  compensationLineItemDefaultInclude,
  type CompensationLineItemWithRelations,
  type ListCompensationLineItemsQuery,
} from './schemas/compensation-line-item.schema';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CompensationLineItemRepository extends BaseRepository<
  CompensationLineItem,
  Prisma.CompensationLineItemCreateInput,
  Prisma.CompensationLineItemUpdateInput,
  Prisma.CompensationLineItemWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.compensationLineItem));
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

  async findPaginated(
    query: ListCompensationLineItemsQuery,
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

  async updateByUid(
    uid: string,
    data: Prisma.CompensationLineItemUpdateInput,
  ): Promise<CompensationLineItemWithRelations | null> {
    const existing = await this.findByUidWithRelations(uid);
    if (!existing) {
      return null;
    }

    return this.delegate.update({
      where: { id: existing.id },
      data,
      include: compensationLineItemDefaultInclude,
    });
  }

  async softDeleteByUid(uid: string): Promise<CompensationLineItemWithRelations | null> {
    return this.updateByUid(uid, { deletedAt: new Date() });
  }

  private buildWhere(
    query: ListCompensationLineItemsQuery,
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
    query: ListCompensationLineItemsQuery,
  ): Prisma.CompensationLineItemTargetWhereInput | undefined {
    const filter: Prisma.CompensationLineItemTargetWhereInput = {};
    let hasFilter = false;

    if (query.targetType) {
      filter.targetType = query.targetType;
      hasFilter = true;
    }

    if (query.targetUid) {
      hasFilter = true;
      Object.assign(filter, this.buildTargetUidFilter(query.targetType, query.targetUid));
    }

    return hasFilter ? filter : undefined;
  }

  private buildTargetUidFilter(
    targetType: ListCompensationLineItemsQuery['targetType'],
    targetUid: string,
  ): Prisma.CompensationLineItemTargetWhereInput {
    if (targetType === 'SHOW') {
      return { show: { uid: targetUid } };
    }
    if (targetType === 'SHOW_CREATOR') {
      return { showCreator: { uid: targetUid } };
    }
    if (targetType === 'STUDIO_SHIFT') {
      return { studioShift: { uid: targetUid } };
    }
    if (targetType === 'STUDIO_SHIFT_BLOCK') {
      return { studioShiftBlock: { uid: targetUid } };
    }

    return {
      OR: [
        { show: { uid: targetUid } },
        { showCreator: { uid: targetUid } },
        { studioShift: { uid: targetUid } },
        { studioShiftBlock: { uid: targetUid } },
      ],
    };
  }
}
