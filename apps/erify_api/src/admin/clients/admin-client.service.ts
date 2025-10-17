import { Injectable } from '@nestjs/common';
import type { Client } from '@prisma/client';

import { ClientService } from '../../client/client.service';
import {
  CreateClientDto,
  UpdateClientDto,
} from '../../client/schemas/client.schema';
import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';

@Injectable()
export class AdminClientService {
  constructor(private readonly clientService: ClientService) {}

  createClient(data: CreateClientDto) {
    return this.clientService.createClient(data);
  }

  getClientById(uid: string) {
    return this.clientService.getClientById(uid);
  }

  updateClient(uid: string, data: UpdateClientDto) {
    return this.clientService.updateClient(uid, data);
  }

  deleteClient(uid: string) {
    return this.clientService.deleteClient(uid);
  }

  async getClients(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<Client>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const clients = await this.clientService.getClients({ skip, take });

    const total = await this.clientService.countClients();
    const totalPages = Math.ceil(total / limit);
    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { data: clients, meta };
  }
}
