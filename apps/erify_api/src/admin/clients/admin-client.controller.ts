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
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ClientDto)
  async createClient(@Body() body: CreateClientDto) {
    const client = await this.adminClientService.createClient(body);
    return client;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(clientDto))
  getClients(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminClientService.getClients(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ClientDto)
  getClient(@Param('uid') uid: string) {
    return this.adminClientService.getClientById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ClientDto)
  updateClient(@Param('uid') uid: string, @Body() body: UpdateClientDto) {
    return this.adminClientService.updateClient(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(@Param('uid') uid: string) {
    await this.adminClientService.deleteClient(uid);
  }
}
