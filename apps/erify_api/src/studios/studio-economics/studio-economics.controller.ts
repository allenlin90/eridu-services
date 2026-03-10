import { Controller, Get, Param, Query } from '@nestjs/common';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import {
  PerformanceQueryDto,
  performanceResponseSchema,
  PnlQueryDto,
  pnlResponseSchema,
  showEconomicsSchema,
} from './schemas/studio-economics.schema';
import { StudioEconomicsService } from './studio-economics.service';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';

@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
@Controller('studios/:studioId')
export class StudioEconomicsController extends BaseStudioController {
  constructor(private readonly studioEconomicsService: StudioEconomicsService) {
    super();
  }

  /**
   * F4.3: Per-show cost breakdown.
   *
   * @preview Backend-only. No UI support in erify_studios.
   * Revenue fields (gmv) read from ShowPlatform but no input workflow exists yet.
   * Commission/hybrid MC costs show as $0 when no revenue is recorded.
   * Full P&L with revenue input workflow is deferred to Phase 5.
   */
  @Get('shows/:showId/economics')
  @ZodResponse(showEconomicsSchema)
  async showEconomics(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
  ) {
    return this.studioEconomicsService.getShowEconomics(studioId, showId);
  }

  /**
   * F4.4: Studio-level cost view grouped by show/schedule/client.
   *
   * @preview Backend-only. No UI support in erify_studios.
   * contribution_margin will be misleading until revenue input workflow ships (Phase 5).
   */
  @Get('economics')
  @ZodResponse(pnlResponseSchema)
  async pnlView(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PnlQueryDto,
  ) {
    return this.studioEconomicsService.getPnlView(studioId, query.group_by, query.date_from, query.date_to);
  }

  /**
   * F4.5: Studio performance metrics grouped by show/schedule/client.
   *
   * @preview Backend-only. No UI support in erify_studios.
   * gmv/sales/orders fields require manual API entry; no FE input workflow exists yet (Phase 5).
   */
  @Get('performance')
  @ZodResponse(performanceResponseSchema)
  async performanceView(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PerformanceQueryDto,
  ) {
    return this.studioEconomicsService.getPerformanceView(studioId, query.group_by, query.date_from, query.date_to);
  }
}
