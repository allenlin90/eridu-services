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
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { PlatformService } from '@/models/platform/platform.service';
import {
  CreatePlatformDto,
  ListPlatformsQueryDto,
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
    const { name, apiConfig, metadata } = body;
    return this.platformService.createPlatform({ name, apiConfig, metadata });
  }

  @Get()
  @AdminPaginatedResponse(platformDto, 'List of platforms with pagination')
  async getPlatforms(@Query() query: ListPlatformsQueryDto) {
    const { data, total } = await this.platformService.listPlatforms({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      includeDeleted: query.includeDeleted,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(platformDto, HttpStatus.OK, 'Platform details')
  async getPlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
  ) {
    const platform = await this.platformService.getPlatformById({ uid: id });
    this.ensureResourceExists(platform, 'Platform', id);
    return platform;
  }

  @Patch(':id')
  @AdminResponse(platformDto, HttpStatus.OK, 'Platform updated successfully')
  async updatePlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
    @Body() body: UpdatePlatformDto,
  ) {
    const platform = await this.platformService.getPlatformById({ uid: id });
    this.ensureResourceExists(platform, 'Platform', id);

    const { name, apiConfig, metadata } = body;
    return this.platformService.updatePlatform(id, { name, apiConfig, metadata });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deletePlatform(
    @Param('id', new UidValidationPipe(PlatformService.UID_PREFIX, 'Platform'))
    id: string,
  ) {
    const platform = await this.platformService.getPlatformById({ uid: id });
    this.ensureResourceExists(platform, 'Platform', id);

    await this.platformService.deletePlatform(id);
  }
}
