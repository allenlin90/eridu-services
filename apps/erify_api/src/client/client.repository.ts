import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

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
    where: Prisma.ClientWhereInput;
    data: Prisma.ClientUpdateInput;
    include?: Record<string, any>;
  }): Promise<Client> {
    // For update operations, we need to find the record first using the where clause
    // and then update using a unique identifier
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.update({
      where: { id: record.id },
      data: args.data,
      ...(args.include && { include: args.include }),
    });
  }

  async delete(args: { where: Prisma.ClientWhereInput }): Promise<Client> {
    // For delete operations, we need to find the record first using the where clause
    // and then delete using a unique identifier
    const record = await this.prismaModel.findFirst({ where: args.where });
    if (!record) {
      throw new Error('Record not found');
    }

    return this.prismaModel.delete({ where: { id: record.id } });
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
