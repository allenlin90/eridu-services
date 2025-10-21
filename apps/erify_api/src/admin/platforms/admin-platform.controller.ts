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
  CreatePlatformDto,
  platformDto,
  UpdatePlatformDto,
} from '../../platform/schemas/platform.schema';
import { AdminPlatformService } from './admin-platform.service';

@Controller('admin/platforms')
export class AdminPlatformController {
  constructor(private readonly adminPlatformService: AdminPlatformService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(platformDto)
  async createPlatform(@Body() body: CreatePlatformDto) {
    const platform = await this.adminPlatformService.createPlatform(body);
    return platform;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(platformDto))
  getPlatforms(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminPlatformService.getPlatforms(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(platformDto)
  getPlatform(@Param('uid') uid: string) {
    return this.adminPlatformService.getPlatformById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(platformDto)
  updatePlatform(@Param('uid') uid: string, @Body() body: UpdatePlatformDto) {
    return this.adminPlatformService.updatePlatform(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlatform(@Param('uid') uid: string) {
    await this.adminPlatformService.deletePlatform(uid);
  }
}
