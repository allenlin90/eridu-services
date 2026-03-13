import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import z from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  studioCreatorAvailabilityItemSchema as studioCreatorAvailabilityItemApiSchema,
  studioCreatorCatalogItemSchema as studioCreatorCatalogItemApiSchema,
  studioCreatorRosterItemSchema as studioCreatorRosterItemApiSchema,
} from '@eridu/api-types/studio-creators';

import { BaseStudioController } from '../base-studio.controller';

import {
  studioCreatorAvailabilityItemDto,
  StudioCreatorAvailabilityQueryDto,
} from './schemas/studio-creator-availability.schema';
import {
  studioCreatorCatalogItemDto,
  StudioCreatorCatalogQueryDto,
} from './schemas/studio-creator-catalog.schema';
import {
  ListStudioCreatorRosterQueryDto,
  studioCreatorRosterItemDto,
} from './schemas/studio-creator-roster-list.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

const STUDIO_CREATOR_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
];

@ApiTags('Studio Creators')
@StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
@Controller('studios/:studioId/creators')
export class StudioCreatorController extends BaseStudioController {
  constructor(
    private readonly studioCreatorService: StudioCreatorService,
  ) {
    super();
  }

  @Get('availability')
  @ZodResponse(z.array(studioCreatorAvailabilityItemApiSchema))
  async availability(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorAvailabilityQueryDto,
  ) {
    const creators = await this.studioCreatorService.listAvailable(studioId, query);
    return creators.map((item) => studioCreatorAvailabilityItemDto.parse(item));
  }

  @Get('catalog')
  @ZodResponse(z.array(studioCreatorCatalogItemApiSchema))
  async catalog(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorCatalogQueryDto,
  ) {
    const creators = await this.studioCreatorService.listCatalog(studioId, query);
    return creators.map((item) => studioCreatorCatalogItemDto.parse(item));
  }

  @Get('roster')
  @ZodPaginatedResponse(studioCreatorRosterItemApiSchema)
  async roster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioCreatorRosterQueryDto,
  ) {
    const { data, total } = await this.studioCreatorService.listRoster(studioId, query);
    return this.createPaginatedResponse(
      data.map((item) => studioCreatorRosterItemDto.parse(item)),
      total,
      this.toPaginationQuery(query),
    );
  }
}
