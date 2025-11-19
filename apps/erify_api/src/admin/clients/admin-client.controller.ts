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
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ClientService } from '@/models/client/client.service';
import {
  clientDto,
  CreateClientDto,
  UpdateClientDto,
} from '@/models/client/schemas/client.schema';

@Controller('admin/clients')
export class AdminClientController extends BaseAdminController {
  constructor(private readonly clientService: ClientService) {
    super();
  }

  @Post()
  @AdminResponse(clientDto, HttpStatus.CREATED, 'Client created successfully')
  createClient(@Body() body: CreateClientDto) {
    return this.clientService.createClient(body);
  }

  @Get()
  @AdminPaginatedResponse(clientDto, 'List of clients with pagination')
  async getClients(@Query() query: PaginationQueryDto) {
    const data = await this.clientService.getClients({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.clientService.countClients();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(clientDto, HttpStatus.OK, 'Client details')
  getClient(
    @Param('id', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    id: string,
  ) {
    return this.clientService.getClientById(id);
  }

  @Patch(':id')
  @AdminResponse(clientDto, HttpStatus.OK, 'Client updated successfully')
  updateClient(
    @Param('id', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    id: string,
    @Body() body: UpdateClientDto,
  ) {
    return this.clientService.updateClient(id, body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteClient(
    @Param('id', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    id: string,
  ) {
    await this.clientService.deleteClient(id);
  }
}
