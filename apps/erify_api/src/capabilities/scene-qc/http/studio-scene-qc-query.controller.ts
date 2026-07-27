import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  sceneQcDailyItemDetailSchema,
  sceneQcDailyItemsResponseSchema,
  sceneQcDailySummarySchema,
} from '@eridu/api-types/scene-qc';

import { SceneQcQueryService } from '../scene-qc-query.service';
import {
  SceneQcItemDetailQueryDto,
  SceneQcItemsQueryDto,
  SceneQcSummaryQueryDto,
} from '../schemas/scene-qc-daily.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

/**
 * Scene QC Daily Review read models: summary, paginated items, Show context
 * detail. Same role set as Scene Profile -- DESIGNER/MANAGER/ADMIN share
 * identical Scene QC permissions. Shows carry `studioId` directly, so scoping
 * is a `show: { studio: { uid: studioId } }` predicate inside the repository
 * -- no Client/Studio linkage probe needed here (contrast the Scene Profile
 * controller). See SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 1.5.
 */
@ApiTags('Studio Scene QC')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-qc')
export class StudioSceneQcQueryController extends BaseStudioController {
  constructor(private readonly sceneQcQueryService: SceneQcQueryService) {
    super();
  }

  @ApiOperation({ summary: 'Daily Scene QC completion summary for one operational date (unfiltered scope)' })
  @Get('summary')
  @ReadBurstThrottle()
  @ZodResponse(sceneQcDailySummarySchema)
  async summary(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: SceneQcSummaryQueryDto,
  ) {
    return this.sceneQcQueryService.getDailySummary(studioId, query.operationalDate);
  }

  @ApiOperation({ summary: 'Paginated Scene QC daily review queue, filterable by client/platform/review_state/search' })
  @Get('items')
  @ReadBurstThrottle()
  @ZodResponse(sceneQcDailyItemsResponseSchema)
  async items(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: SceneQcItemsQueryDto,
  ) {
    const { items, total } = await this.sceneQcQueryService.listDailyItems(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @ApiOperation({ summary: 'Show context for the Daily Review workspace: live evidence, Scene Profile, current review' })
  @Get('items/:showId')
  @ReadBurstThrottle()
  @ZodResponse(sceneQcDailyItemDetailSchema)
  async itemDetail(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Query() query: SceneQcItemDetailQueryDto,
  ) {
    return this.sceneQcQueryService.getDailyItemDetail(studioId, showId, query.operationalDate);
  }
}
