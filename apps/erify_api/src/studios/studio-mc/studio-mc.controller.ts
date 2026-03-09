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
import { McRepository } from '@/models/mc/mc.repository';
import { McService } from '@/models/mc/mc.service';
import { mcDto } from '@/models/mc/schemas/mc.schema';
import { StudioService } from '@/models/studio/studio.service';
import { StudioMcService } from '@/models/studio-mc/studio-mc.service';

@StudioProtected()
@Controller('studios/:studioId/mcs')
export class StudioMcController extends BaseStudioController {
  constructor(
    private readonly mcRepository: McRepository,
    private readonly studioMcService: StudioMcService,
  ) {
    super();
  }

  /**
   * List MCs available (not booked) for the given time window.
   */
  @Get('availability')
  @ZodResponse(z.array(mcDto))
  async availability(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: McAvailabilityQueryDto,
  ) {
    return this.mcRepository.findAvailableMcs(
      query.date_from,
      query.date_to,
      studioId,
    );
  }

  @Get('catalog')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(z.array(mcDto))
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

  @Patch('roster/:mcId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioMcRosterItemDto)
  async updateRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('mcId', new UidValidationPipe(McService.UID_PREFIX, 'MC')) mcId: string,
    @Body() body: UpdateStudioMcRosterDto,
  ) {
    return this.studioMcService.updateRoster(studioId, mcId, body);
  }

  @Delete('roster/:mcId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(studioMcRosterItemDto)
  async removeFromRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('mcId', new UidValidationPipe(McService.UID_PREFIX, 'MC')) mcId: string,
  ) {
    return this.studioMcService.removeFromRoster(studioId, mcId);
  }
}
