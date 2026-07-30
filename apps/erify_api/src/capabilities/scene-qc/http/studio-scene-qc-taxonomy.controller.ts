import { Body, Controller, Delete, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  sceneQcTaxonomyDefectSchema,
  sceneQcTaxonomyElementSchema,
  sceneQcTaxonomySchema,
} from '@eridu/api-types/scene-qc';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { SceneQcTaxonomyService } from '../scene-qc-taxonomy.service';
import {
  CreateSceneQcTaxonomyDefectDto,
  CreateSceneQcTaxonomyElementDto,
} from '../schemas/scene-qc-taxonomy.schema';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

@ApiTags('Studio Scene QC Taxonomy')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-qc-taxonomy')
export class StudioSceneQcTaxonomyController extends BaseStudioController {
  constructor(private readonly taxonomyService: SceneQcTaxonomyService) {
    super();
  }

  @Get()
  @ZodResponse(sceneQcTaxonomySchema)
  list(@Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string) {
    return this.taxonomyService.list();
  }

  @Post('elements')
  @ZodResponse(sceneQcTaxonomyElementSchema, HttpStatus.CREATED)
  createElement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSceneQcTaxonomyElementDto,
  ) {
    return this.taxonomyService.createElement(body, user.ext_id);
  }

  @Post('defects')
  @ZodResponse(sceneQcTaxonomyDefectSchema, HttpStatus.CREATED)
  createDefect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSceneQcTaxonomyDefectDto,
  ) {
    return this.taxonomyService.createDefect(body, user.ext_id);
  }

  @Delete('elements/:elementId')
  @ZodResponse(sceneQcTaxonomyElementSchema)
  retireElement(
    @Param('elementId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT, 'Scene QC element')) elementId: string,
  ) {
    return this.taxonomyService.retireElement(elementId);
  }

  @Delete('defects/:defectId')
  @ZodResponse(sceneQcTaxonomyDefectSchema)
  retireDefect(
    @Param('defectId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_TAXONOMY_DEFECT, 'Scene QC defect')) defectId: string,
  ) {
    return this.taxonomyService.retireDefect(defectId);
  }
}
