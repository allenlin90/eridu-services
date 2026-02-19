import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ClientService } from '@/models/client/client.service';
import {
  clientDto,
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from '@/models/client/schemas/client.schema';

@Controller('admin/clients')
export class AdminClientController extends BaseAdminController {
  constructor(private readonly clientService: ClientService) {
    super();
  }

  @Post()
  @AdminResponse(clientDto, HttpStatus.CREATED, 'Client created successfully')
  async createClient(@Body() body: CreateClientDto) {
    const { name, contactPerson, contactEmail, metadata } = body;
    return this.clientService.createClient({
      name,
      contactPerson,
      contactEmail,
      metadata,
    });
  }

  @Get()
  @AdminPaginatedResponse(clientDto, 'List of clients with pagination')
  async getClients(@Query() query: ListClientsQueryDto) {
    const { data, total } = await this.clientService.listClients(query);

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':uid')
  @AdminResponse(clientDto, HttpStatus.OK, 'Client details')
  async getClient(
    @Param('uid', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    uid: string,
  ) {
    const client = await this.clientService.getClientByUid(uid);
    this.ensureResourceExists(client, 'Client', uid);
    return client;
  }

  @Patch(':uid')
  @AdminResponse(clientDto, HttpStatus.OK, 'Client updated successfully')
  async updateClient(
    @Param('uid', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    uid: string,
    @Body() body: UpdateClientDto,
  ) {
    // 1. Verify existence
    const client = await this.clientService.getClientByUid(uid);
    this.ensureResourceExists(client, 'Client', uid);

    // 2. Perform operation
    const { name, contactPerson, contactEmail, metadata } = body;
    return this.clientService.updateClient(uid, {
      name,
      contactPerson,
      contactEmail,
      metadata,
    });
  }

  @Delete(':uid')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteClient(
    @Param('uid', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    uid: string,
  ) {
    // 1. Verify existence
    const client = await this.clientService.getClientByUid(uid);
    this.ensureResourceExists(client, 'Client', uid);

    // 2. Perform operation
    await this.clientService.deleteClient(uid);
  }
}
