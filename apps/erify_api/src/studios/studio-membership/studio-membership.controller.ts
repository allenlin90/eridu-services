import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  ListStudioMembershipsQueryDto,
  studioMembershipWithRelationsDto,
} from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Memberships')
@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/studio-memberships')
export class StudioMembershipController extends BaseStudioController {
  constructor(
    private readonly studioMembershipService: StudioMembershipService,
  ) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(studioMembershipWithRelationsDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioMembershipsQueryDto,
  ) {
    const { studioId: _ignoredStudioId, ...scopedQuery } = query;
    const { data, total } = await this.studioMembershipService.listStudioMemberships(
      { ...scopedQuery, studioId },
      { user: true, studio: true },
    );

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }
}
