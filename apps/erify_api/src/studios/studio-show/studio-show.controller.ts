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
  Req,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  showRunReviewCreatorExceptionSchema,
  showRunReviewIncompleteTaskSchema,
  showRunReviewShowsRangeRowSchema,
  showRunReviewSummarySchema,
  showRunReviewViolationSchema,
} from '@eridu/api-types/shows';
import {
  showCreatorCompensationSummarySchema as showCreatorCompensationSummaryApiSchema,
  studioShowCreatorListItemSchema as studioShowCreatorListItemApiSchema,
} from '@eridu/api-types/studio-creators';
import { showSummaryCreatorSchema } from '@eridu/api-types/task-management';
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

import type { AuthenticatedRequest, AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { projectAllowList, stripLegacyAuditSidecar } from '@/lib/utils/allow-list-projection.util';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';
import { showMechanicCoverageResponseSchema } from '@/models/client-mechanic/schemas/client-mechanic.schema';
import { CREATOR_UID_PREFIX } from '@/models/creator/creator-uid.util';
import {
  CreateStudioShowDto,
  showPlatformSummaryRelationSchema,
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
import { CreatorCompensationService } from '@/show-orchestration/creator-compensation.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { ShowRunReviewService } from '@/show-orchestration/show-run-review.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

const STUDIO_SHOW_CREATOR_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
];
const STUDIO_SHOW_CREATOR_READ_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
  STUDIO_ROLE.ACCOUNT_MANAGER,
];
const STUDIO_SHOW_WRITE_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
];

// Finance Guardrails S3 — allow-list, not a money-field blacklist. Any field
// NOT in these sets is forced to null for ACCOUNT_MANAGER, so a future money
// field added to either schema is redacted by default instead of leaking.
export const SHOW_CREATOR_SUMMARY_ALLOWED_FOR_AM = new Set([
  'show_creator_id',
  'creator_id',
  'creator_name',
  'creator_alias_name',
]);
export const SHOW_CREATOR_LIST_ITEM_ALLOWED_FOR_AM = new Set([
  'id',
  'creator_id',
  'creator_name',
  'creator_alias_name',
  'note',
  'metadata',
]);
export const SHOW_PLATFORM_SUMMARY_ALLOWED_FOR_AM = new Set([
  'uid',
  'platform',
  'liveStreamLink',
  'platformShowId',
  'viewerCount',
]);
// Compensation totals are restricted to ADMIN/MANAGER (line-item write surface);
// TALENT_MANAGER can read the assignment list but not the money totals.
const STUDIO_SHOW_COMPENSATION_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
];
const STUDIO_SHOW_DELETE_ACCESS_ROLES = [
  STUDIO_ROLE.ADMIN,
];
// Submitted task content is an unstructured per-template JSON blob (no fixed
// money-field shape to allow-list against), so it's gated rather than
// redacted: ACCOUNT_MANAGER doesn't need submitted task results for any of
// its PRD stories (mechanic/template review, not task instances).
const STUDIO_SHOW_TASKS_READ_ROLES = [
  STUDIO_ROLE.ADMIN,
  STUDIO_ROLE.MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
  STUDIO_ROLE.MEMBER,
  STUDIO_ROLE.DESIGNER,
  STUDIO_ROLE.MODERATION_MANAGER,
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

const paginatedShowRunReviewQuerySchema = showRunReviewQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  search: z.string().optional(),
  status: z.enum(['LATE', 'MISSING']).optional(),
  severity: z.string().optional(),
  completeness: z.string().optional(),
});

export class PaginatedShowRunReviewQueryDto extends createZodDto(paginatedShowRunReviewQuerySchema) {}

@StudioProtected() // All studio members can view
@Controller('studios/:studioId/shows')
export class StudioShowController extends BaseStudioController {
  constructor(
    private readonly taskOrchestrationService: TaskOrchestrationService,
    private readonly showOrchestrationService: ShowOrchestrationService,
    private readonly showRunReviewService: ShowRunReviewService,
    private readonly creatorCompensationService: CreatorCompensationService,
    private readonly studioShowManagementService: StudioShowManagementService,
    private readonly clientMechanicService: ClientMechanicService,
  ) {
    super();
  }

  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showWithTaskSummaryDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioShowsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { data, total } = await this.taskOrchestrationService.getStudioShowsWithTaskSummary(studioId, query);
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER) {
      data.forEach((show) => {
        if (show.creators) {
          show.creators = show.creators.map((c) =>
            projectAllowList(showSummaryCreatorSchema, c, SHOW_CREATOR_SUMMARY_ALLOWED_FOR_AM));
        }
      });
    }
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get('run-review')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(showRunReviewSummarySchema)
  async runReview(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ShowRunReviewQueryDto,
  ) {
    return this.showRunReviewService.getShowRunReviewSummary(studioId, query);
  }

  @Get('run-review/creators')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showRunReviewCreatorExceptionSchema)
  async runReviewCreators(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PaginatedShowRunReviewQueryDto,
  ) {
    const { items, total } = await this.showRunReviewService.getShowRunReviewCreators(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @Get('run-review/violations')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showRunReviewViolationSchema)
  async runReviewViolations(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PaginatedShowRunReviewQueryDto,
  ) {
    const { items, total } = await this.showRunReviewService.getShowRunReviewViolations(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @Get('run-review/tasks')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showRunReviewIncompleteTaskSchema)
  async runReviewTasks(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PaginatedShowRunReviewQueryDto,
  ) {
    const { items, total } = await this.showRunReviewService.getShowRunReviewTasks(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @Get('run-review/shows')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showRunReviewShowsRangeRowSchema)
  async runReviewShows(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: PaginatedShowRunReviewQueryDto,
  ) {
    const { items, total } = await this.showRunReviewService.getShowRunReviewShows(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @Get(':id')
  @ZodResponse(studioShowDetailDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const detail = await this.studioShowManagementService.getShowDetail(studioId, id);
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER && detail.showPlatforms) {
      detail.showPlatforms = detail.showPlatforms.map((p) =>
        projectAllowList(showPlatformSummaryRelationSchema, p, SHOW_PLATFORM_SUMMARY_ALLOWED_FOR_AM));
    }
    return detail;
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
  @StudioProtected(STUDIO_SHOW_TASKS_READ_ROLES)
  @ZodResponse(z.array(taskWithRelationsDto))
  async tasks(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    return this.taskOrchestrationService.getShowTasks(studioId, id);
  }

  @Get(':id/mechanics-coverage')
  @ZodResponse(showMechanicCoverageResponseSchema)
  async mechanicsCoverage(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    return this.clientMechanicService.getShowMechanicsCoverage(studioId, id);
  }

  @Get(':id/creators')
  @StudioProtected(STUDIO_SHOW_CREATOR_READ_ROLES)
  @ZodResponse(z.array(studioShowCreatorListItemApiSchema))
  async creators(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.taskOrchestrationService.getStudioShow(studioId, id);
    const creators = await this.showOrchestrationService.listCreatorsForShow(id);
    let mapped = creators.map((item) => studioShowCreatorListItemDto.parse(item));
    const role = request?.studioMembership?.role;
    if (role === STUDIO_ROLE.ACCOUNT_MANAGER) {
      mapped = mapped.map((c) => ({
        ...projectAllowList(studioShowCreatorListItemApiSchema, c, SHOW_CREATOR_LIST_ITEM_ALLOWED_FOR_AM),
        // `metadata` stays allow-listed (it's not `.nullable()` on the public
        // schema), but it can carry `audit.snapshot_overrides[]` — a sidecar
        // of historical agreed_rate/commission_rate/compensation_type values
        // (see legacy-snapshot-merger.ts) — so strip that key specifically.
        metadata: stripLegacyAuditSidecar(c.metadata),
      }));
    }
    return mapped;
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
    const summary = await this.creatorCompensationService.getCreatorCompensationSummaryForShow(studioId, id);
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
