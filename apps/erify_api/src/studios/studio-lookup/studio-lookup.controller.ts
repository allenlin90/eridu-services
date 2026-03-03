import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse } from '@/lib/decorators/zod-response.decorator';
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { PlatformService } from '@/models/platform/platform.service';
import { ListPlatformsQueryDto, platformDto } from '@/models/platform/schemas/platform.schema';
import { ListShowStandardsQueryDto, showStandardDto } from '@/models/show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { showStatusDto } from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ListShowTypesQueryDto, showTypeDto } from '@/models/show-type/schemas/show-type.schema';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Lookup')
@StudioProtected()
@Controller('studios/:studioId')
export class StudioLookupController extends BaseStudioController {
  constructor(
    private readonly showTypeService: ShowTypeService,
    private readonly showStandardService: ShowStandardService,
    private readonly showStatusService: ShowStatusService,
    private readonly platformService: PlatformService,
  ) {
    super();
  }

  @Get('show-types')
  @ZodPaginatedResponse(showTypeDto)
  async getShowTypes(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Query() query: ListShowTypesQueryDto,
  ) {
    const { data, total } = await this.showTypeService.listShowTypes({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      include_deleted: query.include_deleted,
    });
    return this.createPaginatedResponse(data, total, query);
  }

  @Get('show-standards')
  @ZodPaginatedResponse(showStandardDto)
  async getShowStandards(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Query() query: ListShowStandardsQueryDto,
  ) {
    const { data, total } = await this.showStandardService.listShowStandards({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      include_deleted: query.include_deleted,
    });
    return this.createPaginatedResponse(data, total, query);
  }

  @Get('show-statuses')
  @ZodPaginatedResponse(showStatusDto)
  async getShowStatuses(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { data, total } = await this.showStatusService.getShowStatuses({
      skip: query.skip,
      take: query.take,
    });
    return this.createPaginatedResponse(data, total, query);
  }

  @Get('platforms')
  @ZodPaginatedResponse(platformDto)
  async getPlatforms(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Query() query: ListPlatformsQueryDto,
  ) {
    const { data, total } = await this.platformService.listPlatforms({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      includeDeleted: query.includeDeleted,
    });
    return this.createPaginatedResponse(data, total, query);
  }
}
