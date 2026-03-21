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
import { ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE, type StudioRole } from '@eridu/api-types/memberships';
import {
  taskReportDefinitionSchema,
  taskReportPreflightResponseSchema,
  taskReportResultSchema,
  taskReportSourcesResponseSchema,
} from '@eridu/api-types/task-management';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { BaseStudioController } from '../base-studio.controller';

import type { AuthenticatedRequest, AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  CreateTaskReportDefinitionDto,
  ListTaskReportDefinitionsQueryDto,
  TaskReportPreflightQueryDto,
  TaskReportRunDto,
  TaskReportSourcesQueryDto,
  UpdateTaskReportDefinitionDto,
} from '@/models/task-report/schemas/task-report.schema';
import { TaskReportDefinitionService } from '@/models/task-report/task-report-definition.service';
import { TaskReportRunService } from '@/models/task-report/task-report-run.service';
import { TaskReportScopeService } from '@/models/task-report/task-report-scope.service';

@ApiTags('Studio Task Reports')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.MODERATION_MANAGER])
@Controller('studios/:studioId')
export class StudioTaskReportController extends BaseStudioController {
  constructor(
    private readonly taskReportDefinitionService: TaskReportDefinitionService,
    private readonly taskReportScopeService: TaskReportScopeService,
    private readonly taskReportRunService: TaskReportRunService,
  ) {
    super();
  }

  @Get('task-report-definitions')
  @ZodPaginatedResponse(taskReportDefinitionSchema)
  async listDefinitions(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Query() query: ListTaskReportDefinitionsQueryDto,
  ) {
    const pagination = this.toPaginationQuery(query);
    const { data, total } = await this.taskReportDefinitionService.listDefinitions(studioUid, {
      skip: pagination.skip,
      take: pagination.take,
      search: query.search,
    });

    return this.createPaginatedResponse(data, total, pagination);
  }

  @Get('task-report-definitions/:definitionId')
  @ZodResponse(taskReportDefinitionSchema)
  async getDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Param('definitionId', new UidValidationPipe(TaskReportDefinitionService.UID_PREFIX, 'TaskReportDefinition')) definitionUid: string,
  ) {
    return this.taskReportDefinitionService.getDefinition(studioUid, definitionUid);
  }

  @Post('task-report-definitions')
  @ZodResponse(taskReportDefinitionSchema, HttpStatus.CREATED)
  async createDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateTaskReportDefinitionDto,
  ) {
    return this.taskReportDefinitionService.createDefinition(studioUid, user.ext_id, payload);
  }

  @Patch('task-report-definitions/:definitionId')
  @ZodResponse(taskReportDefinitionSchema)
  async updateDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('definitionId', new UidValidationPipe(TaskReportDefinitionService.UID_PREFIX, 'TaskReportDefinition')) definitionUid: string,
    @Body() payload: UpdateTaskReportDefinitionDto,
  ) {
    return this.taskReportDefinitionService.updateDefinition(studioUid, user.ext_id, request.studioMembership!.role as StudioRole, definitionUid, payload);
  }

  @Delete('task-report-definitions/:definitionId')
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('definitionId', new UidValidationPipe(TaskReportDefinitionService.UID_PREFIX, 'TaskReportDefinition')) definitionUid: string,
  ) {
    return this.taskReportDefinitionService.deleteDefinition(studioUid, user.ext_id, request.studioMembership!.role as StudioRole, definitionUid);
  }

  @Get('task-report-sources')
  @ZodResponse(taskReportSourcesResponseSchema)
  async getSources(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Query() query: TaskReportSourcesQueryDto,
  ) {
    return this.taskReportScopeService.getSources(studioUid, query);
  }

  @Get('task-reports/preflight')
  @ZodResponse(taskReportPreflightResponseSchema)
  async preflight(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Query() query: TaskReportPreflightQueryDto,
  ) {
    return this.taskReportScopeService.preflight(studioUid, { scope: query });
  }

  @Post('task-reports/run')
  @ZodResponse(taskReportResultSchema, HttpStatus.CREATED)
  async runReport(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Body() payload: TaskReportRunDto,
  ) {
    return this.taskReportRunService.run(studioUid, payload);
  }
}
