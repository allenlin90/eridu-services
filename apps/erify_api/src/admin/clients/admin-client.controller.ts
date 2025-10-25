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

import { ClientService } from '../../client/client.service';
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
import { UidValidationPipe } from '../../common/pipes/uid-validation.pipe';
import { UtilityService } from '../../utility/utility.service';
import { BaseAdminController } from '../base-admin.controller';

@Controller('admin/clients')
export class AdminClientController extends BaseAdminController {
  constructor(
    private readonly clientService: ClientService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ClientDto)
  createClient(@Body() body: CreateClientDto) {
    return this.clientService.createClient(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(clientDto))
  async getClients(@Query() query: PaginationQueryDto) {
    const data = await this.clientService.getClients({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.clientService.countClients();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ClientDto)
  getClient(
    @Param('id', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    id: string,
  ) {
    return this.clientService.getClientById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ClientDto)
  updateClient(
    @Param('id', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    id: string,
    @Body() body: UpdateClientDto,
  ) {
    return this.clientService.updateClient(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(
    @Param('id', new UidValidationPipe(ClientService.UID_PREFIX, 'Client'))
    id: string,
  ) {
    await this.clientService.deleteClient(id);
  }
}
