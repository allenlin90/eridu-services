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

  async createPending(
    data: Prisma.ShowCancellationResolutionCreateInput,
  ) {
    return this.delegate.create({
      data,
      include: showCancellationResolutionOwnerInclude,
    });
  }

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
