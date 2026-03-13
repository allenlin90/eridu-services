import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { studioShowCreatorListItemSchema as studioShowCreatorListItemApiSchema } from '@eridu/api-types/studio-creators';

import { BaseStudioController } from '../base-studio.controller';

import {
  BulkAssignStudioShowCreatorsDto,
  bulkAssignStudioShowCreatorsResultSchema,
} from './schemas/studio-show-creator-assignment.schema';
import { studioShowCreatorListItemDto } from './schemas/studio-show-creator-list.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CREATOR_UID_PREFIX } from '@/models/creator/creator-uid.util';
import { showDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import {
  ListStudioShowsQueryDto,
  showWithTaskSummaryDto,
  taskWithRelationsDto,
} from '@/models/task/schemas/task.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

const STUDIO_SHOW_CREATOR_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
];

@StudioProtected() // All studio members can view
@Controller('studios/:studioId/shows')
export class StudioShowController extends BaseStudioController {
  constructor(
    private readonly taskOrchestrationService: TaskOrchestrationService,
    private readonly showOrchestrationService: ShowOrchestrationService,
  ) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(showWithTaskSummaryDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioShowsQueryDto,
  ) {
    const { data, total } = await this.taskOrchestrationService.getStudioShowsWithTaskSummary(studioId, query);
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get(':id')
  @ZodResponse(showDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    return this.taskOrchestrationService.getStudioShow(studioId, id);
  }

  @Get(':id/tasks')
  @ZodResponse(z.array(taskWithRelationsDto))
  async tasks(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    return this.taskOrchestrationService.getShowTasks(studioId, id);
  }

  @Get(':id/creators')
  @StudioProtected(STUDIO_SHOW_CREATOR_ACCESS_ROLES)
  @ZodResponse(z.array(studioShowCreatorListItemApiSchema))
  async creators(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    const creators = await this.showOrchestrationService.listCreatorsForShow(id);
    return creators.map((item) => studioShowCreatorListItemDto.parse(item));
  }

  @Post(':id/creators/bulk-assign')
  @StudioProtected(STUDIO_SHOW_CREATOR_ACCESS_ROLES)
  @ZodResponse(bulkAssignStudioShowCreatorsResultSchema)
  async bulkAssignCreators(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: BulkAssignStudioShowCreatorsDto,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    const result = await this.showOrchestrationService.bulkAssignCreatorsToShow(id, body.creators);
    return {
      assigned: result.assigned,
      skipped: result.skipped,
      failed: result.failed.map((item) => ({
        creator_id: item.creatorId,
        reason: item.reason,
      })),
    };
  }

  @Delete(':id/creators/:creatorId')
  @StudioProtected(STUDIO_SHOW_CREATOR_ACCESS_ROLES)
  @HttpCode(204)
  async removeCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Param('creatorId', new UidValidationPipe(CREATOR_UID_PREFIX, 'Creator')) creatorId: string,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    await this.showOrchestrationService.removeCreatorsFromShow(id, [creatorId]);
  }
}
