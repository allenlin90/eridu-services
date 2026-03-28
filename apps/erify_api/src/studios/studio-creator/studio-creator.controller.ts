import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
import {
  CreateStudioCreatorRosterDto,
  UpdateStudioCreatorRosterDto,
} from './schemas/studio-creator-roster-write.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

const STUDIO_CREATOR_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
];

@ApiTags('Studio Creators')
@Controller('studios/:studioId/creators')
export class StudioCreatorController extends BaseStudioController {
  constructor(
    private readonly studioCreatorService: StudioCreatorService,
  ) {
    super();
  }

  @ApiOperation({ summary: 'List studio creator roster' })
  @StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(studioCreatorRosterItemApiSchema)
  async listRoster(
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

  @ApiOperation({ summary: 'Add or reactivate a creator in the studio roster' })
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse(studioCreatorRosterItemApiSchema, HttpStatus.CREATED)
  async addCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: CreateStudioCreatorRosterDto,
  ) {
    const creator = await this.studioCreatorService.addCreatorToRoster(studioId, {
      creatorId: dto.creatorId,
      defaultRate: dto.defaultRate,
      defaultRateType: dto.defaultRateType,
      defaultCommissionRate: dto.defaultCommissionRate,
      metadata: dto.metadata,
    });

    return studioCreatorRosterItemDto.parse(creator);
  }

  @ApiOperation({ summary: 'Update studio creator defaults or active state' })
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Patch(':creatorId')
  @ZodResponse(studioCreatorRosterItemApiSchema)
  async updateCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe('creator', 'Creator')) creatorId: string,
    @Body() dto: UpdateStudioCreatorRosterDto,
  ) {
    const creator = await this.studioCreatorService.updateRosterEntry(studioId, creatorId, {
      version: dto.version,
      defaultRate: dto.defaultRate,
      defaultRateType: dto.defaultRateType,
      defaultCommissionRate: dto.defaultCommissionRate,
      isActive: dto.isActive,
      metadata: dto.metadata,
    });

    return studioCreatorRosterItemDto.parse(creator);
  }

  @ApiOperation({ summary: 'List creators available for show assignment discovery' })
  @StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
  @Get('availability')
  @ReadBurstThrottle()
  @ZodResponse(z.array(studioCreatorAvailabilityItemApiSchema))
  async availability(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorAvailabilityQueryDto,
  ) {
    const creators = await this.studioCreatorService.listAvailable(studioId, query);
    return creators.map((item) => studioCreatorAvailabilityItemDto.parse(item));
  }

  @ApiOperation({ summary: 'List creators from the global catalog for studio use' })
  @StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
  @Get('catalog')
  @ReadBurstThrottle()
  @ZodResponse(z.array(studioCreatorCatalogItemApiSchema))
  async catalog(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorCatalogQueryDto,
  ) {
    const creators = await this.studioCreatorService.listCatalog(studioId, query);
    return creators.map((item) => studioCreatorCatalogItemDto.parse(item));
  }
}
