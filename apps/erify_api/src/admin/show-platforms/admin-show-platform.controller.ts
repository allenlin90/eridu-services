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
import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  CreateShowPlatformDto,
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
  @AdminResponse(
    showPlatformDto,
    HttpStatus.CREATED,
    'Show platform created successfully',
  )
  async createShowPlatform(@Body() body: CreateShowPlatformDto) {
    const showPlatform =
      await this.showPlatformService.createShowPlatformFromDto(body);
    return this.showPlatformService.getShowPlatformById(showPlatform.uid, {
      show: true,
      platform: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(
    showPlatformDto,
    'List of show platforms with pagination',
  )
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
  @AdminResponse(showPlatformDto, HttpStatus.OK, 'Show platform details')
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
    const showPlatform =
      await this.showPlatformService.updateShowPlatformFromDto(id, body);
    // Fetch with relations for proper serialization
    return this.showPlatformService.getShowPlatformById(showPlatform.uid, {
      show: true,
      platform: true,
    });
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
    await this.showPlatformService.deleteShowPlatform(id);
  }
}
