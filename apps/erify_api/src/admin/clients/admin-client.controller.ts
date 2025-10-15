import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  ClientDto,
  clientDto,
  CreateClientDto,
  UpdateClientDto,
} from '../../client/schemas/client.schema';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/pagination/schema/pagination.schema';
import { AdminClientService } from './admin-client.service';

@Controller('admin/clients')
export class AdminClientController {
  constructor(private readonly adminClientService: AdminClientService) {}

  @Post()
  @ZodSerializerDto(ClientDto)
  async createClient(@Body() body: CreateClientDto) {
    const client = await this.adminClientService.createClient(body);
    return client;
  }

  @Get()
  @ZodSerializerDto(createPaginatedResponseSchema(clientDto))
  getClients(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminClientService.getClients(paginationQuery);
  }

  @Get(':id')
  @ZodSerializerDto(ClientDto)
  getClient(@Param('id') id: string) {
    return this.adminClientService.getClientById(id);
  }

  @Patch(':id')
  @ZodSerializerDto(ClientDto)
  updateClient(@Param('id') id: string, @Body() body: UpdateClientDto) {
    return this.adminClientService.updateClient(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(@Param('id') id: string) {
    await this.adminClientService.deleteClient(id);
  }
}
