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
import {
  CreateShowPlatformDto,
  showPlatformDto,
  UpdateShowPlatformDto,
} from '@/models/show-platform/schemas/show-platform.schema';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

@Controller('admin/show-platforms')
export class AdminShowPlatformController extends BaseAdminController {
  constructor(private readonly showPlatformService: ShowPlatformService) {
    super();
  }

  @Post()
  @AdminResponse(
    showPlatformDto,
    HttpStatus.CREATED,
    'Show platform created successfully',
  )
  async createShowPlatform(@Body() body: CreateShowPlatformDto) {
    const { showId, platformId, liveStreamLink, platformShowId, viewerCount, metadata } = body;
    const showPlatform = await this.showPlatformService.create({
      showId,
      platformId,
      liveStreamLink,
      platformShowId,
      viewerCount,
      metadata,
    });
    const result = await this.showPlatformService.findOne(showPlatform.uid, {
      show: true,
      platform: true,
    });

    // Should exist since we just created it
    this.ensureResourceExists(result, 'Show Platform', showPlatform.uid);
    return result;
  }

  @Get()
  @AdminPaginatedResponse(
    showPlatformDto,
    'List of show platforms with pagination',
  )
  async getShowPlatforms(@Query() query: PaginationQueryDto) {
    const result = await this.showPlatformService.getShowPlatforms({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
      include: {
        show: true,
        platform: true,
      },
    });

    return this.createPaginatedResponse(result.data, result.total, query);
  }

  @Get(':id')
  @AdminResponse(showPlatformDto, HttpStatus.OK, 'Show platform details')
  async getShowPlatform(
    @Param(
      'id',
      new UidValidationPipe(ShowPlatformService.UID_PREFIX, 'Show Platform'),
    )
    id: string,
  ) {
    const result = await this.showPlatformService.findOne(id, {
      show: true,
      platform: true,
    });
    this.ensureResourceExists(result, 'Show Platform', id);
    return result;
  }

  @Patch(':id')
  @AdminResponse(
    showPlatformDto,
    HttpStatus.OK,
    'Show platform updated successfully',
  )
  async updateShowPlatform(
    @Param(
      'id',
      new UidValidationPipe(ShowPlatformService.UID_PREFIX, 'Show Platform'),
    )
    id: string,
    @Body() body: UpdateShowPlatformDto,
  ) {
    // 1. Check existence
    const existing = await this.showPlatformService.findOne(id);
    this.ensureResourceExists(existing, 'Show Platform', id);

    const { showId, platformId, liveStreamLink, platformShowId, viewerCount, metadata } = body;

    // 2. Update
    const showPlatform = await this.showPlatformService.update(id, {
      showId,
      platformId,
      liveStreamLink,
      platformShowId,
      viewerCount,
      metadata,
    });

    // 3. Fetch with relations for proper serialization
    const result = await this.showPlatformService.findOne(showPlatform.uid, {
      show: true,
      platform: true,
    });

    this.ensureResourceExists(result, 'Show Platform', id);
    return result;
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowPlatform(
    @Param(
      'id',
      new UidValidationPipe(ShowPlatformService.UID_PREFIX, 'Show Platform'),
    )
    id: string,
  ) {
    const existing = await this.showPlatformService.findOne(id);
    this.ensureResourceExists(existing, 'Show Platform', id);

    await this.showPlatformService.softDelete(id);
  }
}
