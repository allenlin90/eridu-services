import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowCancellationResolution } from '@prisma/client';

import {
  BaseRepository,
  PrismaModelWrapper,
  WithSoftDelete,
} from '@/lib/repositories/base.repository';
import {
  showCancellationResolutionOwnerInclude,
} from '@/models/show-cancellation-resolution/schemas/show-cancellation-resolution.schema';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShowCancellationResolutionRepository extends BaseRepository<
  ShowCancellationResolution & WithSoftDelete,
  Prisma.ShowCancellationResolutionCreateInput,
  Prisma.ShowCancellationResolutionUpdateInput,
  Prisma.ShowCancellationResolutionWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.showCancellationResolution));
  }

  private get delegate() {
    return this.txHost.tx.showCancellationResolution;
  }

  // Engineering decision: cancellation resolution writes must use the CLS
  // transaction delegate and always return the owner include for the API
  // response; BaseRepository.create is intentionally not used because it is
  // backed by the non-transactional Prisma delegate.
  async createPending(
    data: Prisma.ShowCancellationResolutionCreateInput,
  ) {
    return this.delegate.create({
      data,
      include: showCancellationResolutionOwnerInclude,
    });
  }

  // Engineering decision: the pending resolution lookup is the canonical
  // latest-unresolved query for a show. It combines the unresolved-state guard,
  // soft-delete filter, owner include, and createdAt ordering in one repository
  // method so services do not rebuild Prisma query semantics.
  async findPendingForShow(showId: bigint) {
    return this.delegate.findFirst({
      where: {
        showId,
        finalDisposition: null,
        resolvedAt: null,
        deletedAt: null,
      },
      include: showCancellationResolutionOwnerInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Engineering decision: resolution writes must stay transaction-bound and
  // return the same owner include as creation/detail reads; BaseRepository.update
  // would run through the non-transactional delegate.
  async resolvePending(
    uid: string,
    data: Prisma.ShowCancellationResolutionUpdateInput,
  ) {
    return this.delegate.update({
      where: { uid },
      data,
      include: showCancellationResolutionOwnerInclude,
    });
  }
}
