import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ClientService } from '@/models/client/client.service';
import { clientDto, ListClientsQueryDto } from '@/models/client/schemas/client.schema';
import { PlatformService } from '@/models/platform/platform.service';
import { ListPlatformsQueryDto, platformDto } from '@/models/platform/schemas/platform.schema';
import { ListShowStandardsQueryDto, showStandardDto } from '@/models/show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { showStatusDto } from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ListShowTypesQueryDto, showTypeDto } from '@/models/show-type/schemas/show-type.schema';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { StudioService } from '@/models/studio/studio.service';
import { studioShowLookupsDto } from '@/models/task/schemas/task.schema';

const DEFAULT_LOOKUP_LIMIT = 200;

@ApiTags('Studio Lookup')
@StudioProtected()
@Controller('studios/:studioId')
export class StudioLookupController extends BaseStudioController {
  constructor(
    private readonly clientService: ClientService,
    private readonly showTypeService: ShowTypeService,
    private readonly showStandardService: ShowStandardService,
    private readonly showStatusService: ShowStatusService,
    private readonly platformService: PlatformService,
  ) {
    super();
  }

  @Get('show-lookups')
  @ReadBurstThrottle()
  @ZodResponse(studioShowLookupsDto)
  async getShowLookups(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
  ) {
    const [showTypes, showStandards, showStatuses, platforms] = await Promise.all([
      this.showTypeService.listShowTypes({ take: DEFAULT_LOOKUP_LIMIT }),
      this.showStandardService.listShowStandards({ take: DEFAULT_LOOKUP_LIMIT }),
      this.showStatusService.getShowStatuses({ take: DEFAULT_LOOKUP_LIMIT }),
      this.platformService.listPlatforms({ take: DEFAULT_LOOKUP_LIMIT }),
    ]);

    return {
      show_types: showTypes.data.map((item) => showTypeDto.parse(item)),
      show_standards: showStandards.data.map((item) => showStandardDto.parse(item)),
      show_statuses: showStatuses.data.map((item) => showStatusDto.parse(item)),
      platforms: platforms.data.map((item) => platformDto.parse(item)),
    };
  }

  @Get('show-types')
  @ReadBurstThrottle()
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

  @Get('clients')
  @ReadBurstThrottle()
  @ZodPaginatedResponse(clientDto)
  async getClients(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Query() query: ListClientsQueryDto,
  ) {
    const { data, total } = await this.clientService.listClients({
      ...query,
      include_deleted: false,
    });
    return this.createPaginatedResponse(data, total, query);
  }

  @Get('show-standards')
  @ReadBurstThrottle()
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
  @ReadBurstThrottle()
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
  @ReadBurstThrottle()
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
