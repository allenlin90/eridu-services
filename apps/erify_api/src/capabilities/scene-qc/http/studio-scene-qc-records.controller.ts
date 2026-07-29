import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { sceneQcRecordDetailSchema, sceneQcRecordsResponseSchema } from '@eridu/api-types/scene-qc';

import { SceneQcRecordsQueryService } from '../scene-qc-records.query.service';
import { SceneQcRecordsQueryDto } from '../schemas/scene-qc-records.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

/**
 * Scene QC Records: the paginated confirmed/unconfirmed review history list
 * and its detail. Same role set as the rest of the capability. See
 * SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.4.
 */
@ApiTags('Studio Scene QC Records')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-qc-records')
export class StudioSceneQcRecordsController extends BaseStudioController {
  constructor(private readonly recordsQueryService: SceneQcRecordsQueryService) {
    super();
  }

  @ApiOperation({ summary: 'Paginated Scene QC review history, filterable by date range/client/platform/result' })
  @Get()
  @ReadBurstThrottle()
  @ZodResponse(sceneQcRecordsResponseSchema)
  async list(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: SceneQcRecordsQueryDto,
  ) {
    const { items, total } = await this.recordsQueryService.listRecords(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @ApiOperation({ summary: 'Records detail: review context, pinned evidence, confirmation identity/status, curated audit history' })
  @Get(':reviewId')
  @ReadBurstThrottle()
  @ZodResponse(sceneQcRecordDetailSchema)
  async detail(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('reviewId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_REVIEW, 'Scene QC review')) reviewId: string,
  ) {
    return this.recordsQueryService.getRecordDetail(studioId, reviewId);
  }
}
