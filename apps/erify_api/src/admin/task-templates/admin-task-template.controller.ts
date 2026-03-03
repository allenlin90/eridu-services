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
import type { TaskStatus } from '@prisma/client';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  adminTaskTemplateBindingDto,
  adminTaskTemplateDto,
  CreateAdminTaskTemplateDto,
  ListAdminTaskTemplateBindingsQueryDto,
  ListAdminTaskTemplatesQueryDto,
  taskTemplateDto,
  taskTemplateUsageSummaryDto,
  UpdateAdminTaskTemplateDto,
} from '@/models/task-template/schemas/task-template.schema';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

@Controller('admin/task-templates')
export class AdminTaskTemplateController extends BaseAdminController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {
    super();
  }

  @Post()
  @AdminResponse(taskTemplateDto, HttpStatus.CREATED, 'Task template created successfully')
  async createTaskTemplate(@Body() body: CreateAdminTaskTemplateDto) {
    const { name, description, task_type, schema, studio_id } = body;

    return this.taskTemplateService.createTemplateWithSnapshot({
      name,
      description,
      taskType: task_type,
      currentSchema: schema,
      studioId: studio_id,
    });
  }

  @Get()
  @AdminPaginatedResponse(adminTaskTemplateDto, 'List task templates with usage summary')
  async getTaskTemplates(@Query() query: ListAdminTaskTemplatesQueryDto) {
    const { data, total } = await this.taskTemplateService.getAdminTaskTemplatesWithUsage({
      skip: query.skip,
      take: query.take,
      search: query.search,
      studioUid: query.studio_id,
      studioName: query.studio_name,
      taskType: query.task_type,
      isActive: query.is_active,
      includeDeleted: query.include_deleted,
      sort: query.sort,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get(':id')
  @AdminResponse(taskTemplateDto, HttpStatus.OK, 'Task template details')
  async getTaskTemplate(
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'Task Template'))
    id: string,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne({ uid: id });
    this.ensureResourceExists(taskTemplate, 'Task Template', id);
    return taskTemplate;
  }

  @Patch(':id')
  @AdminResponse(taskTemplateDto, HttpStatus.OK, 'Task template updated successfully')
  async updateTaskTemplate(
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'Task Template'))
    id: string,
    @Body() body: UpdateAdminTaskTemplateDto,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne(
      { uid: id, deletedAt: null },
      { studio: { select: { uid: true } } },
    ) as ({ studio: { uid: string } } | null);
    this.ensureResourceExists(taskTemplate, 'Task Template', id);

    const { name, description, task_type, schema, version } = body;
    return this.taskTemplateService.updateTemplateWithSnapshot(
      id,
      taskTemplate.studio.uid,
      {
        name,
        description,
        taskType: task_type,
        currentSchema: schema,
        version,
      },
    );
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteTaskTemplate(
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'Task Template'))
    id: string,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne({ uid: id, deletedAt: null });
    this.ensureResourceExists(taskTemplate, 'Task Template', id);
    await this.taskTemplateService.softDelete({ uid: id });
  }

  @Get(':id/usage-summary')
  @AdminResponse(taskTemplateUsageSummaryDto, HttpStatus.OK, 'Task template usage summary')
  async getUsageSummary(
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'Task Template'))
    id: string,
  ) {
    const summary = await this.taskTemplateService.getTemplateUsageSummary(id);
    this.ensureResourceExists(summary, 'Task Template', id);
    return summary;
  }

  @Get(':id/bindings')
  @AdminPaginatedResponse(adminTaskTemplateBindingDto, 'Task template bindings')
  async getTemplateBindings(
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'Task Template'))
    id: string,
    @Query() query: ListAdminTaskTemplateBindingsQueryDto,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne({ uid: id });
    this.ensureResourceExists(taskTemplate, 'Task Template', id);

    const { data, total } = await this.taskTemplateService.getTemplateBindings({
      templateUid: id,
      status: query.status as TaskStatus | TaskStatus[] | undefined,
      showStartFrom: query.show_start_from,
      showStartTo: query.show_start_to,
      includeDeleted: query.include_deleted,
      skip: query.skip,
      take: query.take,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }
}
