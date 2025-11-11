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
import {
  CreateShowPlatformDto,
  ShowPlatformDto,
  showPlatformDto,
  UpdateShowPlatformDto,
} from '@/models/show-platform/schemas/show-platform.schema';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/show-platforms')
export class AdminShowPlatformController extends BaseAdminController {
  constructor(
    private readonly showPlatformService: ShowPlatformService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(showPlatformDto, 'Show platform created successfully')
  @ZodSerializerDto(ShowPlatformDto)
  async createShowPlatform(@Body() body: CreateShowPlatformDto) {
    const showPlatform =
      await this.showPlatformService.createShowPlatformFromDto(body);
    return this.showPlatformService.getShowPlatformById(showPlatform.uid, {
      show: true,
      platform: true,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showPlatformDto),
    'List of show platforms with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showPlatformDto))
  async getShowPlatforms(@Query() query: PaginationQueryDto) {
    const data = await this.showPlatformService.getActiveShowPlatforms({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
      include: {
        show: true,
        platform: true,
      },
    });
    const total = await this.showPlatformService.countShowPlatforms();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showPlatformDto, 'Show platform details')
  @ZodSerializerDto(ShowPlatformDto)
  getShowPlatform(
    @Param(
      'id',
      new UidValidationPipe(ShowPlatformService.UID_PREFIX, 'Show Platform'),
    )
    id: string,
  ) {
    return this.showPlatformService.getShowPlatformById(id, {
      show: true,
      platform: true,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showPlatformDto, 'Show platform updated successfully')
  @ZodSerializerDto(ShowPlatformDto)
  async updateShowPlatform(
    @Param(
      'id',
      new UidValidationPipe(ShowPlatformService.UID_PREFIX, 'Show Platform'),
    )
    id: string,
    @Body() body: UpdateShowPlatformDto,
  ) {
    const showPlatform =
      await this.showPlatformService.updateShowPlatformFromDto(id, body);
    // Fetch with relations for proper serialization
    return this.showPlatformService.getShowPlatformById(showPlatform.uid, {
      show: true,
      platform: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowPlatform(
    @Param(
      'id',
      new UidValidationPipe(ShowPlatformService.UID_PREFIX, 'Show Platform'),
    )
    id: string,
  ) {
    await this.showPlatformService.deleteShowPlatform(id);
  }
}
