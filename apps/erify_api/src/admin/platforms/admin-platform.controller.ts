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

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import { PlatformService } from '@/models/platform/platform.service';
import {
  CreatePlatformDto,
  platformDto,
  UpdatePlatformDto,
} from '@/models/platform/schemas/platform.schema';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/platforms')
export class AdminPlatformController extends BaseAdminController {
  constructor(
    private readonly platformService: PlatformService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(platformDto, 'Platform created successfully')
  @ZodSerializerDto(platformDto)
  createPlatform(@Body() body: CreatePlatformDto) {
    return this.platformService.createPlatform(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(platformDto),
    'List of platforms with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(platformDto))
  async getPlatforms(@Query() query: PaginationQueryDto) {
    const data = await this.platformService.getPlatforms({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.platformService.countPlatforms();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(platformDto, 'Platform details')
  @ZodSerializerDto(platformDto)
  getPlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
  ) {
    return this.platformService.getPlatformById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(platformDto, 'Platform updated successfully')
  @ZodSerializerDto(platformDto)
  updatePlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
    @Body() body: UpdatePlatformDto,
  ) {
    return this.platformService.updatePlatform(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
  ) {
    await this.platformService.deletePlatform(id);
  }
}
