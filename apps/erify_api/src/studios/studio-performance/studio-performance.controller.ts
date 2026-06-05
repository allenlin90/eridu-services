import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  performanceSummaryResponseSchema,
  showPerformanceResponseSchema,
} from '@eridu/api-types/performance';

import { BaseStudioController } from '../base-studio.controller';

import {
  PerformanceQueryDto,
  PerformanceShowsQueryDto,
} from './schemas/studio-performance.schema';
import { StudioPerformanceService } from './studio-performance.service';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Performance')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
@Controller('studios/:studioId/performance')
export class StudioPerformanceController extends BaseStudioController {
  constructor(private readonly performanceService: StudioPerformanceService) {
    super();
  }

  @ApiOperation({ summary: 'Get studio show performance summary' })
  @Get('summary')
  @ReadBurstThrottle()
  @ZodResponse(performanceSummaryResponseSchema)
  async getSummary(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PerformanceQueryDto,
  ) {
    return this.performanceService.getPerformanceSummary(studioId, query);
  }

  @ApiOperation({ summary: 'Get paginated list of shows with performance metrics' })
  @Get('shows')
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showPerformanceResponseSchema)
  async listShows(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PerformanceShowsQueryDto,
  ) {
    const { items, total } = await this.performanceService.getPerformanceShows(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }
}
