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
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  taskReportPreflightResponseSchema,
  taskReportResultSchema,
  taskReportSourcesResponseSchema,
} from '@eridu/api-types/task-management';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  TaskReportPreflightDto,
  TaskReportRunDto,
  TaskReportSourcesQueryDto,
} from '@/models/task-report/schemas/task-report.schema';
import { TaskReportDefinitionService } from '@/models/task-report/task-report-definition.service';
import { TaskReportRunService } from '@/models/task-report/task-report-run.service';
import { TaskReportScopeService } from '@/models/task-report/task-report-scope.service';

// TODO: replace placeholder schemas for task-report-definition CRUD endpoints.
const placeholderSchema = z.unknown();

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
  @ZodPaginatedResponse(placeholderSchema)
  async listDefinitions(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
  ) {
    return this.taskReportDefinitionService.listDefinitions(studioUid);
  }

  @Get('task-report-definitions/:definitionId')
  @ZodResponse(placeholderSchema)
  async getDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Param('definitionId', new UidValidationPipe(TaskReportDefinitionService.UID_PREFIX, 'TaskReportDefinition')) definitionUid: string,
  ) {
    return this.taskReportDefinitionService.getDefinition(studioUid, definitionUid);
  }

  @Post('task-report-definitions')
  @ZodResponse(placeholderSchema, HttpStatus.CREATED)
  async createDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Body() payload: unknown,
  ) {
    return this.taskReportDefinitionService.createDefinition(studioUid, payload);
  }

  @Patch('task-report-definitions/:definitionId')
  @ZodResponse(placeholderSchema)
  async updateDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Param('definitionId', new UidValidationPipe(TaskReportDefinitionService.UID_PREFIX, 'TaskReportDefinition')) definitionUid: string,
    @Body() payload: unknown,
  ) {
    return this.taskReportDefinitionService.updateDefinition(studioUid, definitionUid, payload);
  }

  @Delete('task-report-definitions/:definitionId')
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteDefinition(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Param('definitionId', new UidValidationPipe(TaskReportDefinitionService.UID_PREFIX, 'TaskReportDefinition')) definitionUid: string,
  ) {
    return this.taskReportDefinitionService.deleteDefinition(studioUid, definitionUid);
  }

  @Get('task-report-sources')
  @ZodResponse(taskReportSourcesResponseSchema)
  async getSources(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Query() query: TaskReportSourcesQueryDto,
  ) {
    return this.taskReportScopeService.getSources(studioUid, query);
  }

  @Post('task-reports/preflight')
  @ZodResponse(taskReportPreflightResponseSchema)
  async preflight(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioUid: string,
    @Body() payload: TaskReportPreflightDto,
  ) {
    return this.taskReportScopeService.preflight(studioUid, payload);
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
