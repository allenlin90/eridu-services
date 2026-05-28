import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { showRunReviewSummarySchema } from '@eridu/api-types/shows';
import {
  showCreatorCompensationSummarySchema as showCreatorCompensationSummaryApiSchema,
  studioShowCreatorListItemSchema as studioShowCreatorListItemApiSchema,
} from '@eridu/api-types/studio-creators';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { BaseStudioController } from '../base-studio.controller';

import {
  BulkAssignStudioShowCreatorsDto,
  bulkAssignStudioShowCreatorsResultSchema,
} from './schemas/studio-show-creator-assignment.schema';
import { showCreatorCompensationSummaryDto } from './schemas/studio-show-creator-compensation-summary.schema';
import { studioShowCreatorListItemDto } from './schemas/studio-show-creator-list.schema';
import { UpdateStudioShowCreatorDto } from './schemas/studio-show-creator-update.schema';
import { StudioShowManagementService } from './studio-show-management.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CREATOR_UID_PREFIX } from '@/models/creator/creator-uid.util';
import {
  CreateStudioShowDto,
  studioShowDetailDto,
  UpdateStudioShowDto,
} from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
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
const STUDIO_SHOW_WRITE_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
];
// Compensation totals are restricted to ADMIN/MANAGER (line-item write surface);
// TALENT_MANAGER can read the assignment list but not the money totals.
const STUDIO_SHOW_COMPENSATION_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
];
const STUDIO_SHOW_DELETE_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
];

const isoDateTimeSchema = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !Number.isNaN(d.getTime());
  },
  { message: 'Must be a valid ISO date-time string' },
);

// Bounds the operational-day query window so a single request cannot pull an
// unbounded show graph into memory for in-process aggregation.
const SHOW_RUN_REVIEW_MAX_RANGE_DAYS = 31;
const SHOW_RUN_REVIEW_MAX_RANGE_MS = SHOW_RUN_REVIEW_MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;

const showRunReviewQuerySchema = z
  .object({
    date_from: isoDateTimeSchema,
    date_to: isoDateTimeSchema,
  })
  .refine(
    (data) => {
      return new Date(data.date_to) >= new Date(data.date_from);
    },
    {
      message: 'date_to must be after or equal to date_from',
      path: ['date_to'],
    },
  )
  .refine(
    (data) => {
      const rangeMs = new Date(data.date_to).getTime() - new Date(data.date_from).getTime();
      return rangeMs <= SHOW_RUN_REVIEW_MAX_RANGE_MS;
    },
    {
      message: `Date range must not exceed ${SHOW_RUN_REVIEW_MAX_RANGE_DAYS} days`,
      path: ['date_to'],
    },
  );

export class ShowRunReviewQueryDto extends createZodDto(showRunReviewQuerySchema) {}

@StudioProtected() // All studio members can view
@Controller('studios/:studioId/shows')
export class StudioShowController extends BaseStudioController {
  constructor(
    private readonly taskOrchestrationService: TaskOrchestrationService,
    private readonly showOrchestrationService: ShowOrchestrationService,
    private readonly studioShowManagementService: StudioShowManagementService,
  ) {
    super();
  }

  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showWithTaskSummaryDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioShowsQueryDto,
  ) {
    const { data, total } = await this.taskOrchestrationService.getStudioShowsWithTaskSummary(studioId, query);
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get('run-review')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(showRunReviewSummarySchema)
  async runReview(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ShowRunReviewQueryDto,
  ) {
    return this.showOrchestrationService.getShowRunReviewSummary(studioId, query);
  }

  @Get(':id')
  @ZodResponse(studioShowDetailDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    return this.studioShowManagementService.getShowDetail(studioId, id);
  }

  @Post()
  @StudioProtected(STUDIO_SHOW_WRITE_ACCESS_ROLES)
  @ZodResponse(studioShowDetailDto, HttpStatus.CREATED)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateStudioShowDto,
  ) {
    return this.studioShowManagementService.createShow(studioId, body);
  }

  @Patch(':id')
  @StudioProtected(STUDIO_SHOW_WRITE_ACCESS_ROLES)
  @ZodResponse(studioShowDetailDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: UpdateStudioShowDto,
  ) {
    return this.studioShowManagementService.updateShow(studioId, id, body);
  }

  @Delete(':id')
  @StudioProtected(STUDIO_SHOW_DELETE_ACCESS_ROLES)
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async delete(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    await this.studioShowManagementService.deleteShow(studioId, id);
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    const result = await this.showOrchestrationService.bulkAssignCreatorsToShow(
      studioId,
      id,
      body.creators,
      user.ext_id,
    );
    return {
      assigned: result.assigned,
      skipped: result.skipped,
      failed: result.failed.map((item) => ({
        creator_id: item.creatorId,
        reason: item.reason,
      })),
    };
  }

  @Get(':id/creators/compensation-summary')
  @StudioProtected(STUDIO_SHOW_COMPENSATION_ACCESS_ROLES)
  @ZodResponse(showCreatorCompensationSummaryApiSchema)
  async creatorCompensationSummary(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    const summary = await this.showOrchestrationService.getCreatorCompensationSummaryForShow(studioId, id);
    return showCreatorCompensationSummaryDto.parse(summary);
  }

  @Patch(':id/creators/:showCreatorId')
  @StudioProtected(STUDIO_SHOW_COMPENSATION_ACCESS_ROLES)
  @ZodResponse(studioShowCreatorListItemApiSchema)
  async updateCreatorAssignment(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Param('showCreatorId', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'ShowCreator')) showCreatorId: string,
    @Body() body: UpdateStudioShowCreatorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    const updated = await this.showOrchestrationService.updateCreatorForShow(
      id,
      showCreatorId,
      body,
      user.ext_id,
    );
    return studioShowCreatorListItemDto.parse(updated);
  }

  @Delete(':id/creators/:creatorId')
  @StudioProtected(STUDIO_SHOW_CREATOR_ACCESS_ROLES)
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async removeCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Param('creatorId', new UidValidationPipe(CREATOR_UID_PREFIX, 'Creator')) creatorId: string,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    await this.showOrchestrationService.removeCreatorsFromShow(id, [creatorId]);
  }
}
