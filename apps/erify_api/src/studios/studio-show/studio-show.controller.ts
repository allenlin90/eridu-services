import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import {
  BulkMcAssignmentDto,
  bulkMcAssignmentResponseSchema,
} from './schemas/studio-show-mc-bulk.schema';
import { StudioShowMcOrchestrationService } from './studio-show-mc.orchestration.service';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { showDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import {
  ListStudioShowsQueryDto,
  showWithTaskSummaryDto,
  taskWithRelationsDto,
} from '@/models/task/schemas/task.schema';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

@StudioProtected() // All studio members can view
@Controller('studios/:studioId/shows')
export class StudioShowController extends BaseStudioController {
  constructor(
    private readonly taskOrchestrationService: TaskOrchestrationService,
    private readonly studioShowMcOrchestrationService: StudioShowMcOrchestrationService,
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

  @Patch('mc-assignments/bulk')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(bulkMcAssignmentResponseSchema)
  async bulkAppendMcs(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: BulkMcAssignmentDto,
  ) {
    return this.studioShowMcOrchestrationService.bulkAppendMcsToShows(
      studioId,
      body.show_ids,
      body.mc_ids,
    );
  }

  @Put('mc-assignments/bulk')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(bulkMcAssignmentResponseSchema)
  async bulkReplaceMcs(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: BulkMcAssignmentDto,
  ) {
    return this.studioShowMcOrchestrationService.bulkReplaceMcsToShows(
      studioId,
      body.show_ids,
      body.mc_ids,
    );
  }
}
