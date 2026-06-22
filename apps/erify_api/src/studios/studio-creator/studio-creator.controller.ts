import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import z from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  studioCreatorAvailabilityItemSchema as studioCreatorAvailabilityItemApiSchema,
  studioCreatorCatalogItemSchema as studioCreatorCatalogItemApiSchema,
  studioCreatorCompensationResponseSchema as studioCreatorCompensationResponseApiSchema,
  studioCreatorRosterItemSchema as studioCreatorRosterItemApiSchema,
} from '@eridu/api-types/studio-creators';
import { userApiResponseSchema } from '@eridu/api-types/users';

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
  studioCreatorCompensationDto,
  StudioCreatorCompensationQueryDto,
} from './schemas/studio-creator-compensation.schema';
import { OnboardStudioCreatorDto } from './schemas/studio-creator-onboard.schema';
import { StudioCreatorOnboardingUserSearchQueryDto } from './schemas/studio-creator-onboarding-user-search.schema';
import {
  ListStudioCreatorRosterQueryDto,
  studioCreatorRosterItemDto,
} from './schemas/studio-creator-roster-list.schema';
import {
  CreateStudioCreatorRosterDto,
  UpdateStudioCreatorRosterDto,
} from './schemas/studio-creator-roster-write.schema';

import type { AuthenticatedRequest } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { projectAllowList } from '@/lib/utils/allow-list-projection.util';
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';
import { userDto } from '@/models/user/schemas/user.schema';
import { CreatorCompensationService } from '@/show-orchestration/creator-compensation.service';

const STUDIO_CREATOR_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
  STUDIO_ROLE.ACCOUNT_MANAGER,
];
const STUDIO_CREATOR_COMPENSATION_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
];
const STUDIO_CREATOR_ROSTER_MANAGER_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
];

// Finance Guardrails S3 — allow-list, not a money-field blacklist. Any roster
// field NOT in this set is forced to null for ACCOUNT_MANAGER, so a future
// money field added to the schema is redacted by default instead of leaking.
export const ROSTER_ITEM_ALLOWED_FOR_AM = new Set([
  'id',
  'creator_id',
  'creator_name',
  'creator_alias_name',
  'is_active',
  'version',
  'metadata',
  'created_at',
  'updated_at',
]);
export const CATALOG_ITEM_ALLOWED_FOR_AM = new Set([
  'id',
  'name',
  'alias_name',
  'is_rostered',
  'roster_state',
]);
export const AVAILABILITY_ITEM_ALLOWED_FOR_AM = new Set([
  'id',
  'name',
  'alias_name',
]);

@ApiTags('Studio Creators')
@Controller('studios/:studioId/creators')
export class StudioCreatorController extends BaseStudioController {
  constructor(
    private readonly studioCreatorService: StudioCreatorService,
    private readonly creatorCompensationService: CreatorCompensationService,
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
    @Req() request?: AuthenticatedRequest,
  ) {
    const { data, total } = await this.studioCreatorService.listRoster(studioId, query);
    let parsed = data.map((item) => studioCreatorRosterItemDto.parse(item));
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER) {
      parsed = parsed.map((c) =>
        projectAllowList(studioCreatorRosterItemApiSchema, c, ROSTER_ITEM_ALLOWED_FOR_AM));
    }
    return this.createPaginatedResponse(
      parsed,
      total,
      this.toPaginationQuery(query),
    );
  }

  @ApiOperation({ summary: 'Add or reactivate a creator in the studio roster' })
  @StudioProtected(STUDIO_CREATOR_ROSTER_MANAGER_ROLES)
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

  @ApiOperation({ summary: 'Create and onboard a brand-new creator into studio roster' })
  @StudioProtected(STUDIO_CREATOR_ROSTER_MANAGER_ROLES)
  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse(studioCreatorRosterItemApiSchema, HttpStatus.CREATED)
  async onboardCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: OnboardStudioCreatorDto,
  ) {
    const creator = await this.studioCreatorService.onboardCreator(studioId, {
      creator: {
        name: dto.creator.name,
        aliasName: dto.creator.aliasName,
        userId: dto.creator.userId,
        metadata: dto.creator.metadata,
      },
      roster: {
        defaultRate: dto.roster.defaultRate,
        defaultRateType: dto.roster.defaultRateType,
        defaultCommissionRate: dto.roster.defaultCommissionRate,
        metadata: dto.roster.metadata,
      },
    });

    return studioCreatorRosterItemDto.parse(creator);
  }

  @ApiOperation({ summary: 'Update studio creator defaults or active state' })
  @StudioProtected(STUDIO_CREATOR_ROSTER_MANAGER_ROLES)
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

  @ApiOperation({ summary: 'List creator compensation across shows in a date range' })
  @StudioProtected(STUDIO_CREATOR_COMPENSATION_ROLES)
  @Get(':creatorId/compensations')
  @ReadBurstThrottle()
  @ZodResponse(studioCreatorCompensationResponseApiSchema)
  async listCreatorCompensations(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe('creator', 'Creator')) creatorId: string,
    @Query() query: StudioCreatorCompensationQueryDto,
  ) {
    const compensation = await this.creatorCompensationService.getCreatorCompensations(
      studioId,
      creatorId,
      {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
    );
    return studioCreatorCompensationDto.parse(compensation);
  }

  @ApiOperation({ summary: 'List creators available for show assignment discovery' })
  @StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
  @Get('availability')
  @ReadBurstThrottle()
  @ZodResponse(z.array(studioCreatorAvailabilityItemApiSchema))
  async availability(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorAvailabilityQueryDto,
    @Req() request?: AuthenticatedRequest,
  ) {
    const creators = await this.studioCreatorService.listAvailable(studioId, query);
    let parsed = creators.map((item) => studioCreatorAvailabilityItemDto.parse(item));
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER) {
      parsed = parsed.map((c) =>
        projectAllowList(studioCreatorAvailabilityItemApiSchema, c, AVAILABILITY_ITEM_ALLOWED_FOR_AM));
    }
    return parsed;
  }

  @ApiOperation({ summary: 'List creators from the global catalog for studio use' })
  @StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
  @Get('catalog')
  @ReadBurstThrottle()
  @ZodResponse(z.array(studioCreatorCatalogItemApiSchema))
  async catalog(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorCatalogQueryDto,
    @Req() request?: AuthenticatedRequest,
  ) {
    const creators = await this.studioCreatorService.listCatalog(studioId, query);
    let parsed = creators.map((item) => studioCreatorCatalogItemDto.parse(item));
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER) {
      parsed = parsed.map((c) =>
        projectAllowList(studioCreatorCatalogItemApiSchema, c, CATALOG_ITEM_ALLOWED_FOR_AM));
    }
    return parsed;
  }

  @ApiOperation({ summary: 'Search users eligible for creator onboarding user link' })
  @StudioProtected(STUDIO_CREATOR_ROSTER_MANAGER_ROLES)
  @Get('onboarding-users')
  @ReadBurstThrottle()
  @ZodResponse(z.array(userApiResponseSchema))
  async onboardingUsers(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: StudioCreatorOnboardingUserSearchQueryDto,
  ) {
    const users = await this.studioCreatorService.searchOnboardingUsers(studioId, {
      search: query.search,
      limit: query.limit,
    });
    return users.map((user) => userDto.parse(user));
  }

  // Registered after the static GET routes above (`availability`, `catalog`,
  // `onboarding-users`) so the `:creatorId` param route does not shadow them.
  @ApiOperation({ summary: 'Get a single studio creator roster entry' })
  @StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)
  @Get(':creatorId')
  @ReadBurstThrottle()
  @ZodResponse(studioCreatorRosterItemApiSchema)
  async getCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('creatorId', new UidValidationPipe('creator', 'Creator')) creatorId: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    const creator = await this.studioCreatorService.findRosterEntry(studioId, creatorId);

    if (!creator) {
      throw HttpError.notFound('Creator not found in studio roster');
    }

    const parsed = studioCreatorRosterItemDto.parse(creator);
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER) {
      return projectAllowList(studioCreatorRosterItemApiSchema, parsed, ROSTER_ITEM_ALLOWED_FOR_AM);
    }
    return parsed;
  }
}
