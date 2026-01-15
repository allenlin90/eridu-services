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
import { PlatformService } from '@/models/platform/platform.service';
import {
  CreatePlatformDto,
  platformDto,
  UpdatePlatformDto,
} from '@/models/platform/schemas/platform.schema';

@Controller('admin/platforms')
export class AdminPlatformController extends BaseAdminController {
  constructor(private readonly platformService: PlatformService) {
    super();
  }

  @Post()
  @AdminResponse(
    platformDto,
    HttpStatus.CREATED,
    'Platform created successfully',
  )
  createPlatform(@Body() body: CreatePlatformDto) {
    return this.platformService.createPlatform(body);
  }

  @Get()
  @AdminPaginatedResponse(platformDto, 'List of platforms with pagination')
  async getPlatforms(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.platformService.listPlatforms({
      skip: query.skip,
      take: query.take,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(platformDto, HttpStatus.OK, 'Platform details')
  getPlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
  ) {
    return this.platformService.getPlatformById(id);
  }

  @Patch(':id')
  @AdminResponse(platformDto, HttpStatus.OK, 'Platform updated successfully')
  updatePlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
    @Body() body: UpdatePlatformDto,
  ) {
    return this.platformService.updatePlatform(id, body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deletePlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
  ) {
    await this.platformService.deletePlatform(id);
  }
}
