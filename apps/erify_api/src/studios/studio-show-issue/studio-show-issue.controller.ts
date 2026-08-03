import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { auditApiResponseSchema } from '@eridu/api-types/audits';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { BaseStudioController } from '../base-studio.controller';
import { ShowAuditQueryDto } from '../studio-show/schemas/studio-show-audit.schema';

import type { AuthenticatedRequest, AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateShowIssueDto,
  EscalateShowIssueDto,
  ListShowIssuesQueryDto,
  ReopenShowIssueDto,
  ResolveShowIssueDto,
  showIssueApiResponseZodSchema,
  UpdateShowIssueDto,
} from '@/models/show-issue/schemas/show-issue.schema';
import { SHOW_ISSUE_UID_PREFIX } from '@/models/show-issue/show-issue-uid.util';
import { StudioService } from '@/models/studio/studio.service';
import { ShowIssueWorkflowService } from '@/show-issue-orchestration/show-issue-workflow.service';

const SHOW_ISSUE_WRITE_ROLES = [STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER];

/**
 * Show-level issue ownership — manual workflow (Phase 5 item 9). Top-level
 * studio-scoped collection: ShowIssue has its own UID, audit trail,
 * pagination, and soft-delete lifecycle, so it is not nested under
 * `/shows/:id/`. `show_id` is a create field and a list filter instead.
 * See docs/SHOW_ISSUE_OWNERSHIP.md.
 */
@StudioProtected() // All active studio members can read
@Controller('studios/:studioId/show-issues')
export class StudioShowIssueController extends BaseStudioController {
  constructor(
    private readonly showIssueWorkflowService: ShowIssueWorkflowService,
  ) {
    super();
  }

  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(showIssueApiResponseZodSchema)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListShowIssuesQueryDto,
  ) {
    const { items, total } = await this.showIssueWorkflowService.listShowIssues(studioId, query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @Get(':issueId')
  @ZodResponse(showIssueApiResponseZodSchema)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('issueId', new UidValidationPipe(SHOW_ISSUE_UID_PREFIX, 'ShowIssue')) issueId: string,
  ) {
    return this.showIssueWorkflowService.getShowIssue(studioId, issueId);
  }

  @Get(':issueId/audits')
  @ReadBurstThrottle()
  @ZodPaginatedResponse(auditApiResponseSchema)
  async audits(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('issueId', new UidValidationPipe(SHOW_ISSUE_UID_PREFIX, 'ShowIssue')) issueId: string,
    @Query() query: ShowAuditQueryDto,
  ) {
    const { page, limit } = query;
    const { items, total } = await this.showIssueWorkflowService.getShowIssueAudits(studioId, issueId, {
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.createPaginatedResponse(items, total, this.toPaginationQuery({ page, limit }));
  }

  @Post()
  @StudioProtected(SHOW_ISSUE_WRITE_ROLES)
  @ZodResponse(showIssueApiResponseZodSchema)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateShowIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.showIssueWorkflowService.createShowIssue(studioId, body, user.ext_id);
  }

  @Patch(':issueId')
  @StudioProtected() // any active member — the assigned member may start their own issue
  @ZodResponse(showIssueApiResponseZodSchema)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('issueId', new UidValidationPipe(SHOW_ISSUE_UID_PREFIX, 'ShowIssue')) issueId: string,
    @Body() body: UpdateShowIssueDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.showIssueWorkflowService.updateShowIssue(
      studioId,
      issueId,
      body,
      user.ext_id,
      request?.studioMembership?.role,
    );
  }

  @Post(':issueId/resolve')
  @StudioProtected() // any active member — the assigned member may resolve their own issue
  @ZodResponse(showIssueApiResponseZodSchema)
  async resolve(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('issueId', new UidValidationPipe(SHOW_ISSUE_UID_PREFIX, 'ShowIssue')) issueId: string,
    @Body() body: ResolveShowIssueDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.showIssueWorkflowService.resolveShowIssue(
      studioId,
      issueId,
      body,
      user.ext_id,
      request?.studioMembership?.role,
    );
  }

  @Post(':issueId/reopen')
  @StudioProtected(SHOW_ISSUE_WRITE_ROLES)
  @ZodResponse(showIssueApiResponseZodSchema)
  async reopen(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('issueId', new UidValidationPipe(SHOW_ISSUE_UID_PREFIX, 'ShowIssue')) issueId: string,
    @Body() body: ReopenShowIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.showIssueWorkflowService.reopenShowIssue(studioId, issueId, body, user.ext_id);
  }

  @Post(':issueId/escalate')
  @StudioProtected(SHOW_ISSUE_WRITE_ROLES)
  @ZodResponse(showIssueApiResponseZodSchema)
  async escalate(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('issueId', new UidValidationPipe(SHOW_ISSUE_UID_PREFIX, 'ShowIssue')) issueId: string,
    @Body() body: EscalateShowIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.showIssueWorkflowService.escalateShowIssue(studioId, issueId, body, user.ext_id);
  }
}
