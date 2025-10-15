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
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/pagination/schema/pagination.schema';
import {
  CreateMcDto,
  McDto,
  mcDto,
  UpdateMcDto,
} from '../../mc/schemas/mc.schema';
import { AdminMcService } from './admin-mc.service';

@Controller('admin/mcs')
export class AdminMcController {
  constructor(private readonly adminMcService: AdminMcService) {}

  @Post()
  @ZodSerializerDto(McDto)
  async createMc(@Body() body: CreateMcDto) {
    const mc = await this.adminMcService.createMc(body);
    return mc;
  }

  @Get()
  @ZodSerializerDto(createPaginatedResponseSchema(mcDto))
  getMcs(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminMcService.getMcs(paginationQuery);
  }

  @Get(':id')
  @ZodSerializerDto(McDto)
  getMc(@Param('id') id: string) {
    return this.adminMcService.getMcById(id);
  }

  @Patch(':id')
  @ZodSerializerDto(McDto)
  updateMc(@Param('id') id: string, @Body() body: UpdateMcDto) {
    return this.adminMcService.updateMc(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMc(@Param('id') id: string) {
    await this.adminMcService.deleteMc(id);
  }
}
