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
  mcWithUserDto,
  UpdateMcDto,
} from '../../mc/schemas/mc.schema';
import { AdminMcService } from './admin-mc.service';

@Controller('admin/mcs')
export class AdminMcController {
  constructor(private readonly adminMcService: AdminMcService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(mcWithUserDto)
  async createMc(@Body() body: CreateMcDto) {
    const mc = await this.adminMcService.createMc(body);
    return mc;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(mcWithUserDto))
  getMcs(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminMcService.getMcs(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(mcWithUserDto)
  getMc(@Param('uid') uid: string) {
    return this.adminMcService.getMcById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(mcWithUserDto)
  updateMc(@Param('uid') uid: string, @Body() body: UpdateMcDto) {
    return this.adminMcService.updateMc(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMc(@Param('uid') uid: string) {
    await this.adminMcService.deleteMc(uid);
  }
}
