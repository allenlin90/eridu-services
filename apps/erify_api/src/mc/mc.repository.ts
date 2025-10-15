import { Injectable } from '@nestjs/common';
import { MC, Prisma } from '@prisma/client';

import { BaseRepository } from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class McRepository extends BaseRepository<
  MC,
  Prisma.MCCreateInput,
  Prisma.MCUpdateInput,
  Prisma.MCWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.mC);
  }

  async findByUid(uid: string): Promise<MC | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async findByName(name: string): Promise<MC | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveMCs(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.MCOrderByWithRelationInput;
  }): Promise<MC[]> {
    const { skip, take, orderBy } = params;
    return this.model.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy,
    });
  }
}
