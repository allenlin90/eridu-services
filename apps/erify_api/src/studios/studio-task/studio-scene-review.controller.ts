import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  sceneReviewDetailSchema,
  sceneReviewListItemSchema,
} from '@eridu/api-types/task-management';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { SceneReviewService } from '@/models/task/scene-review.service';
import { SceneReviewQueryDto } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';

const SCENE_REVIEW_ROLES = [STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.DESIGNER] as const;

@ApiTags('Studio Scene Review')
@Controller('studios/:studioId/scene-review')
export class StudioSceneReviewController extends BaseStudioController {
  constructor(private readonly sceneReviewService: SceneReviewService) {
    super();
  }

  @ApiOperation({ summary: 'List screenshot evidence for scene analysis or QC review' })
  @StudioProtected([...SCENE_REVIEW_ROLES])
  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(sceneReviewListItemSchema)
  async list(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: SceneReviewQueryDto,
  ) {
    const { items, total } = await this.sceneReviewService.list(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @ApiOperation({ summary: 'Get screenshot evidence detail for Scene Review' })
  @StudioProtected([...SCENE_REVIEW_ROLES])
  @Get(':taskId')
  @ReadBurstThrottle()
  @ZodResponse(sceneReviewDetailSchema)
  async detail(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('taskId', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) taskId: string,
  ) {
    const detail = await this.sceneReviewService.findDetail(studioId, taskId);
    this.ensureResourceExists(detail, 'Scene review evidence', taskId);
    return detail;
  }
}
