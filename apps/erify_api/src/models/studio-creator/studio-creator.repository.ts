import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, StudioCreator } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type StudioCreatorRosterRecord = StudioCreator & {
  creator: {
    uid: string;
    name: string;
    aliasName: string;
  };
};

@Injectable()
export class StudioCreatorRepository extends BaseRepository<
  StudioCreator,
  Prisma.StudioCreatorCreateInput,
  Prisma.StudioCreatorUpdateInput,
  Prisma.StudioCreatorWhereInput
> {
  constructor(
    prisma: PrismaService, // only used to seed BaseRepository; all queries go through txHost
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.studioCreator));
  }

  private get delegate() {
    return this.txHost.tx.studioCreator;
  }

  async findByStudioUidPaginated(
    studioUid: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      isActive?: boolean;
      defaultRateType?: string | null;
    },
  ): Promise<{ data: StudioCreatorRosterRecord[]; total: number }> {
    const search = params.search?.trim();
    const where: Prisma.StudioCreatorWhereInput = {
      deletedAt: null,
      studio: {
        uid: studioUid,
        deletedAt: null,
      },
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.defaultRateType !== undefined && {
        defaultRateType: params.defaultRateType,
      }),
      creator: {
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
      },
    };

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        include: {
          creator: {
            select: {
              uid: true,
              name: true,
              aliasName: true,
            },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { creator: { name: 'asc' } },
        ],
        skip: params.skip,
        take: params.take,
      }),
      this.delegate.count({ where }),
    ]);

    return { data, total };
  }
}
