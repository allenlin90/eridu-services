import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  groupedEconomicsResponseSchema,
  showEconomicsResponseSchema,
} from '@eridu/api-types/economics';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { EconomicsService } from '@/models/economics/economics.service';
import type {
  GroupedEconomicsResult,
  ShowEconomicsResult,
} from '@/models/economics/schemas/economics.schema';
import {
  GroupedEconomicsQueryDto,
} from '@/models/economics/schemas/economics.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Economics')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
@Controller('studios/:studioId')
export class StudioEconomicsController extends BaseStudioController {
  constructor(private readonly economicsService: EconomicsService) {
    super();
  }

  @Get('shows/:showId/economics')
  @ZodResponse(showEconomicsResponseSchema)
  async getShowEconomics(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioUid: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    showUid: string,
  ) {
    const result = await this.economicsService.getShowEconomics(studioUid, showUid);
    return this.transformShowEconomicsToApi(result);
  }

  @Get('economics')
  @ZodResponse(groupedEconomicsResponseSchema)
  async getGroupedEconomics(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioUid: string,
    @Query() query: GroupedEconomicsQueryDto,
  ) {
    const result = await this.economicsService.getGroupedEconomics(studioUid, query);
    return this.transformGroupedEconomicsToApi(result);
  }

  // ============================================================================
  // Private transform helpers: camelCase service result → snake_case API
  // ============================================================================

  private transformShowEconomicsToApi(result: ShowEconomicsResult) {
    return {
      show_id: result.showUid,
      show_name: result.showName,
      show_external_id: result.showExternalId,
      start_time: result.startTime.toISOString(),
      end_time: result.endTime.toISOString(),
      client_name: result.clientName,
      creator_costs: result.creatorCosts.map((c) => ({
        creator_id: c.creatorUid,
        creator_name: c.creatorName,
        compensation_type: c.compensationType,
        agreed_rate: c.agreedRate,
        computed_cost: c.computedCost,
      })),
      shift_costs: result.shiftCosts.map((s) => ({
        shift_id: s.shiftUid,
        user_name: s.userName,
        hourly_rate: s.hourlyRate,
        overlap_minutes: s.overlapMinutes,
        attributed_cost: s.attributedCost,
      })),
      total_creator_cost: result.totalCreatorCost,
      total_shift_cost: result.totalShiftCost,
      total_cost: result.totalCost,
    };
  }

  private transformGroupedEconomicsToApi(result: GroupedEconomicsResult) {
    return {
      groups: result.groups.map((g) => ({
        group_key: g.groupKey,
        group_label: g.groupLabel,
        show_count: g.showCount,
        total_creator_cost: g.totalCreatorCost,
        total_shift_cost: g.totalShiftCost,
        total_cost: g.totalCost,
      })),
      summary: {
        total_creator_cost: result.summary.totalCreatorCost,
        total_shift_cost: result.summary.totalShiftCost,
        total_cost: result.summary.totalCost,
        show_count: result.summary.showCount,
      },
    };
  }
}
