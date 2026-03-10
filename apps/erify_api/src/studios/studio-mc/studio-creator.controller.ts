import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import z from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { CreatorAvailabilityPayloadDto } from './schemas/studio-creator-availability.schema';
import { StudioCreatorCatalogQueryDto } from './schemas/studio-creator-catalog.schema';
import {
  CreateStudioCreatorRosterDto,
  studioCreatorRosterItemDto,
  UpdateStudioCreatorRosterDto,
} from './schemas/studio-creator-roster.schema';
import { ListStudioCreatorRosterQueryDto } from './schemas/studio-creator-roster-list.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { CreatorService } from '@/models/creator/creator.service';
import { creatorDto } from '@/models/creator/schemas/creator.schema';
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
@Controller('studios/:studioId/creators')
export class StudioCreatorController extends BaseStudioController {
  constructor(
    private readonly creatorRepository: CreatorRepository,
    private readonly studioCreatorService: StudioCreatorService,
  ) {
    super();
  }

  @Post('availability:check')
  @ZodResponse(z.array(creatorDto))
  async availability(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreatorAvailabilityPayloadDto,
  ) {
    const windows = body.windows.map((w) => ({
      dateFrom: w.date_from,
      dateTo: w.date_to,
    }));

    return this.creatorRepository.findAvailableCreators(
      windows,
      studioId,
    );
  }

  @Get('catalog')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(z.array(creatorDto))
  async catalog(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorCatalogQueryDto,
  ) {
    return this.studioCreatorService.listCatalog(studioId, {
      search: query.search,
      includeRostered: query.include_rostered,
      limit: query.limit,
    });
  }

  @Get('roster')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodPaginatedResponse(studioCreatorRosterItemDto)
  async listRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioCreatorRosterQueryDto,
  ) {
    const { data, total } = await this.studioCreatorService.listRoster(studioId, query);
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Post('roster')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioCreatorRosterItemDto)
  async addToRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateStudioCreatorRosterDto,
  ) {
    return this.studioCreatorService.addToRoster(studioId, body);
  }

  @Patch('roster/:creatorId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioCreatorRosterItemDto)
  async updateRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe(CreatorService.VALID_UID_PREFIXES, 'Creator')) creatorId: string,
    @Body() body: UpdateStudioCreatorRosterDto,
  ) {
    return this.studioCreatorService.updateRoster(studioId, creatorId, body);
  }

  @Delete('roster/:creatorId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioCreatorRosterItemDto)
  async removeFromRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe(CreatorService.VALID_UID_PREFIXES, 'Creator')) creatorId: string,
  ) {
    return this.studioCreatorService.removeFromRoster(studioId, creatorId);
  }
}
