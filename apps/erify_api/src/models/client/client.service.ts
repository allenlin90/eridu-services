import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import { CreateClientDto, UpdateClientDto } from './schemas/client.schema';
import { ClientRepository } from './client.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ClientService extends BaseModelService {
  static readonly UID_PREFIX = 'client';
  protected readonly uidPrefix = ClientService.UID_PREFIX;

  constructor(
    private readonly clientRepository: ClientRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createClient(data: CreateClientDto): Promise<Client> {
    const uid = this.generateUid();
    return this.clientRepository.create({ ...data, uid });
  }

  async getClientById(uid: string): Promise<Client> {
    return this.findClientOrThrow(uid);
  }

  async findClientById(id: bigint): Promise<Client | null> {
    return this.clientRepository.findOne({ id });
  }

  async getClients(query: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    include_deleted?: boolean;
  }): Promise<Client[]> {
    const where: Prisma.ClientWhereInput = {};

    if (!query.include_deleted) {
      where.deletedAt = null;
    }

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.uid) {
      where.uid = {
        contains: query.uid,
        mode: 'insensitive',
      };
    }

    return this.clientRepository.findMany({
      skip: query.skip,
      take: query.take,
      where,
    });
  }

  async listClients(query: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    include_deleted?: boolean;
  }): Promise<{ data: Client[]; total: number }> {
    const where: Prisma.ClientWhereInput = {};

    if (!query.include_deleted) {
      where.deletedAt = null;
    }

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.uid) {
      where.uid = {
        contains: query.uid,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.clientRepository.findMany({
        skip: query.skip,
        take: query.take,
        where,
      }),
      this.clientRepository.count(where),
    ]);

    return { data, total };
  }

  async getActiveClients(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ClientOrderByWithRelationInput;
  }): Promise<Client[]> {
    return this.clientRepository.findActiveClients(params);
  }

  async countClients(where?: Prisma.ClientWhereInput): Promise<number> {
    return this.clientRepository.count(where ?? {});
  }

  async updateClient(uid: string, data: UpdateClientDto): Promise<Client> {
    await this.findClientOrThrow(uid);
    return this.clientRepository.update({ uid }, data);
  }

  async deleteClient(uid: string): Promise<Client> {
    await this.findClientOrThrow(uid);
    return this.clientRepository.softDelete({ uid });
  }

  private async findClientOrThrow(uid: string): Promise<Client> {
    const client = await this.clientRepository.findByUid(uid);
    if (!client) {
      throw HttpError.notFound('Client', uid);
    }
    return client;
  }
}
