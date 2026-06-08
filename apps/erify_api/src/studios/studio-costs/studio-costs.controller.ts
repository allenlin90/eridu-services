import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  costsSummaryResponseSchema,
  shiftCostResponseSchema,
  showCostResponseSchema,
} from '@eridu/api-types/costs';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import {
  CostsQueryDto,
  CostsShiftsQueryDto,
  CostsShowsQueryDto,
} from './schemas/studio-costs.schema';
import { StudioCostsService } from './studio-costs.service';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Costs')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
@Controller('studios/:studioId/costs')
export class StudioCostsController extends BaseStudioController {
  constructor(private readonly costsService: StudioCostsService) {
    super();
  }

  @ApiOperation({ summary: 'Get studio show and shift costs summary' })
  @Get('summary')
  @ReadBurstThrottle()
  @ZodResponse(costsSummaryResponseSchema)
  async getSummary(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: CostsQueryDto,
  ) {
    return this.costsService.getCostsSummary(studioId, query);
  }

  @ApiOperation({ summary: 'Get paginated list of shows with costs breakdown' })
  @Get('shows')
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showCostResponseSchema)
  async listShows(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: CostsShowsQueryDto,
  ) {
    const { items, total } = await this.costsService.getCostsShows(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @ApiOperation({ summary: 'Get paginated list of operator shifts with costs breakdown' })
  @Get('shifts')
  @ReadBurstThrottle()
  @ZodPaginatedResponse(shiftCostResponseSchema)
  async listShifts(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: CostsShiftsQueryDto,
  ) {
    const { items, total } = await this.costsService.getCostsShifts(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }
}
