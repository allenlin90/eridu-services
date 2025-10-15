import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import { BaseRepository } from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientRepository extends BaseRepository<
  Client,
  Prisma.ClientCreateInput,
  Prisma.ClientUpdateInput,
  Prisma.ClientWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.client);
  }

  async findByUid(uid: string): Promise<Client | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async findByName(name: string): Promise<Client | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveClients(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ClientOrderByWithRelationInput;
  }): Promise<Client[]> {
    const { skip, take, orderBy } = params;
    return this.model.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy,
    });
  }
}
