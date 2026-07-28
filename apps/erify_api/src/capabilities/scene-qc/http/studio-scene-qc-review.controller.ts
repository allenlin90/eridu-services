import { Body, Controller, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { SceneQcWorkflowService } from '../scene-qc-review-workflow.service';
import { CreateSceneQcReviewDto, sceneQcReviewDto, UpdateSceneQcReviewDto } from '../schemas/scene-qc-review.schema';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

/**
 * Scene QC review create/update commands -- the §8.2 review save transaction.
 * Same role set as the query controller and Scene Profile. See
 * SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 1.5/1.9.
 */
@ApiTags('Studio Scene QC Reviews')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-qc-reviews')
export class StudioSceneQcReviewController extends BaseStudioController {
  constructor(private readonly sceneQcWorkflowService: SceneQcWorkflowService) {
    super();
  }

  @ApiOperation({ summary: 'Create a Scene QC review draft for a Show and operational date' })
  @Post()
  @ZodResponse(sceneQcReviewDto, HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateSceneQcReviewDto,
  ) {
    return this.sceneQcWorkflowService.createReview(studioId, body, {
      actorExtId: user.ext_id,
      studioUid: studioId,
    });
  }

  @ApiOperation({ summary: 'Update an editable (unconfirmed) Scene QC review draft, version-checked' })
  @Patch(':reviewId')
  @ZodResponse(sceneQcReviewDto, HttpStatus.OK)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('reviewId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_REVIEW, 'Scene QC review')) reviewId: string,
    @Body() body: UpdateSceneQcReviewDto,
  ) {
    return this.sceneQcWorkflowService.updateReview(studioId, reviewId, body, {
      actorExtId: user.ext_id,
      studioUid: studioId,
    });
  }
}
