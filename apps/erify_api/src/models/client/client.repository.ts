import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '@/common/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

// Custom model wrapper that implements IBaseModel with ClientWhereInput
class ClientModelWrapper
  implements
    IBaseModel<
      Client,
      Prisma.ClientCreateInput,
      Prisma.ClientUpdateInput,
      Prisma.ClientWhereInput
    >
{
  constructor(private readonly prismaModel: Prisma.ClientDelegate) {}

  async create(args: {
    data: Prisma.ClientCreateInput;
    include?: Record<string, any>;
  }): Promise<Client> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.ClientWhereInput;
    include?: Record<string, any>;
  }): Promise<Client | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ClientWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<Client[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.ClientWhereUniqueInput;
    data: Prisma.ClientUpdateInput;
    include?: Record<string, any>;
  }): Promise<Client> {
    return this.prismaModel.update(args);
  }

  async delete(args: {
    where: Prisma.ClientWhereUniqueInput;
  }): Promise<Client> {
    return this.prismaModel.delete(args);
  }

  async count(args: { where: Prisma.ClientWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class ClientRepository extends BaseRepository<
  Client,
  Prisma.ClientCreateInput,
  Prisma.ClientUpdateInput,
  Prisma.ClientWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ClientModelWrapper(prisma.client));
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
