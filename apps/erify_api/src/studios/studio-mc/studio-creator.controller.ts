import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import z from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { McAvailabilityQueryDto } from './schemas/studio-mc-availability.schema';
import { StudioMcCatalogQueryDto } from './schemas/studio-mc-catalog.schema';
import {
  CreateStudioMcRosterDto,
  studioMcRosterItemDto,
  UpdateStudioMcRosterDto,
} from './schemas/studio-mc-roster.schema';
import { ListStudioMcRosterQueryDto } from './schemas/studio-mc-roster-list.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { CreatorService } from '@/models/creator/creator.service';
import { creatorDto } from '@/models/creator/schemas/creator.schema';
import { StudioService } from '@/models/studio/studio.service';
import { StudioMcService } from '@/models/studio-mc/studio-mc.service';

@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
@Controller('studios/:studioId/creators')
export class StudioCreatorController extends BaseStudioController {
  constructor(
    private readonly creatorRepository: CreatorRepository,
    private readonly studioMcService: StudioMcService,
  ) {
    super();
  }

  @Get('availability')
  @ZodResponse(z.array(creatorDto))
  async availability(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: McAvailabilityQueryDto,
  ) {
    return this.creatorRepository.findAvailableMcs(
      query.date_from,
      query.date_to,
      studioId,
    );
  }

  @Get('catalog')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(z.array(creatorDto))
  async catalog(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioMcCatalogQueryDto,
  ) {
    return this.studioMcService.listCatalog(studioId, {
      search: query.search,
      includeRostered: query.include_rostered,
      limit: query.limit,
    });
  }

  @Get('roster')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodPaginatedResponse(studioMcRosterItemDto)
  async listRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioMcRosterQueryDto,
  ) {
    const { data, total } = await this.studioMcService.listRoster(studioId, query);
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Post('roster')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioMcRosterItemDto)
  async addToRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateStudioMcRosterDto,
  ) {
    return this.studioMcService.addToRoster(studioId, body);
  }

  @Patch('roster/:creatorId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioMcRosterItemDto)
  async updateRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe(CreatorService.UID_PREFIX, 'Creator')) creatorId: string,
    @Body() body: UpdateStudioMcRosterDto,
  ) {
    return this.studioMcService.updateRoster(studioId, creatorId, body);
  }

  @Delete('roster/:creatorId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioMcRosterItemDto)
  async removeFromRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe(CreatorService.UID_PREFIX, 'Creator')) creatorId: string,
  ) {
    return this.studioMcService.removeFromRoster(studioId, creatorId);
  }
}
