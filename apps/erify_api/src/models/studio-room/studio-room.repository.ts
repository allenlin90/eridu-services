import { Injectable } from '@nestjs/common';
import type { Prisma, StudioRoom } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class StudioRoomRepository extends BaseRepository<
  StudioRoom,
  Prisma.StudioRoomCreateInput,
  Prisma.StudioRoomUpdateInput,
  Prisma.StudioRoomWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.studioRoom));
  }

  async findByUid(
    uid: string,
    include?: Prisma.StudioRoomInclude,
  ): Promise<StudioRoom | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByNameAndStudioId(
    name: string,
    studioId: bigint,
  ): Promise<StudioRoom | null> {
    return this.model.findFirst({
      where: { name, studioId, deletedAt: null },
    });
  }

  async findPaginated(params: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    includeDeleted?: boolean;
    studioUid?: string;
    orderBy?: 'asc' | 'desc';
    includeStudio?: boolean;
  }): Promise<{ data: StudioRoom[]; total: number }> {
    const { skip, take, name, uid, includeDeleted, studioUid, orderBy, includeStudio } = params;

    const where: Prisma.StudioRoomWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (uid) {
      where.uid = {
        contains: uid,
        mode: 'insensitive',
      };
    }

    if (studioUid) {
      where.studio = { uid: studioUid };
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        where,
        orderBy: orderBy ? { createdAt: orderBy } : undefined,
        include: includeStudio ? { studio: true } : undefined,
      }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }
}
