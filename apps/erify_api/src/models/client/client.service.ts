import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

import { ClientRepository } from './client.repository';
import { CreateClientDto, UpdateClientDto } from './schemas/client.schema';

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

  async getClients(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ClientWhereInput;
  }): Promise<Client[]> {
    return this.clientRepository.findMany(params);
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
