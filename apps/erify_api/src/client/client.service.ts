import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import { HttpError } from '../common/errors/http-error.util';
import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { ClientRepository } from './client.repository';
import { CreateClientDto, UpdateClientDto } from './schemas/client.schema';

@Injectable()
export class ClientService {
  static readonly UID_PREFIX = 'client';

  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createClient(data: CreateClientDto): Promise<Client> {
    const uid = this.utilityService.generateBrandedId(ClientService.UID_PREFIX);

    const payload = { ...data, uid };

    try {
      return await this.clientRepository.create(payload);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        // name is unique; contactEmail might be unique at business level
        throw HttpError.conflict('Client already exists');
      }
      throw error;
    }
  }

  async getClientById(uid: string): Promise<Client> {
    const client = await this.clientRepository.findByUid(uid);
    if (!client) {
      throw HttpError.notFound('Client', uid);
    }
    return client;
  }

  async findClientById(id: bigint): Promise<Client | null> {
    const client = await this.clientRepository.findOne({ id });

    return client;
  }

  async updateClient(uid: string, data: UpdateClientDto): Promise<Client> {
    const client = await this.clientRepository.findByUid(uid);
    if (!client) {
      throw HttpError.notFound('Client', uid);
    }

    try {
      return await this.clientRepository.update({ uid }, data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Client already exists');
      }
      throw error;
    }
  }

  async getClients(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ClientWhereInput;
  }): Promise<Client[]> {
    const { skip, take, where } = params;
    return this.clientRepository.findMany({ skip, take, where });
  }

  async countClients(where?: Prisma.ClientWhereInput): Promise<number> {
    return this.clientRepository.count(
      where ?? ({} as Prisma.ClientWhereInput),
    );
  }

  async deleteClient(uid: string): Promise<Client> {
    const client = await this.clientRepository.findByUid(uid);
    if (!client) {
      throw HttpError.notFound('Client', uid);
    }
    return this.clientRepository.softDelete({ uid });
  }

  async getActiveClients(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ClientOrderByWithRelationInput;
  }): Promise<Client[]> {
    return this.clientRepository.findActiveClients(params);
  }
}
