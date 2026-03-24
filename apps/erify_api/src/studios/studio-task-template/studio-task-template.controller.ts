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

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  CreateStudioTaskTemplateDto,
  ListTaskTemplatesQueryDto,
  taskTemplateDto,
  UpdateStudioTaskTemplateDto,
} from '@/models/task-template/schemas/task-template.schema';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
@Controller('studios/:studioId/task-templates')
export class StudioTaskTemplateController extends BaseStudioController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {
    super();
  }

  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(taskTemplateDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListTaskTemplatesQueryDto,
  ) {
    const { data, total } = await this.taskTemplateService.getTaskTemplates({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      includeDeleted: query.includeDeleted,
      taskType: query.taskType,
      templateKind: query.templateKind,
      isActive: query.isActive,
      studioUid: studioId,
      sort: query.sort,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get(':id')
  @ZodResponse(taskTemplateDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    });

    if (!taskTemplate) {
      throw HttpError.notFound('Task template not found');
    }

    return taskTemplate;
  }

  @Post()
  @ZodResponse(taskTemplateDto, HttpStatus.CREATED)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() createStudioTaskTemplateDto: CreateStudioTaskTemplateDto,
  ) {
    const { name, description, task_type, schema } = createStudioTaskTemplateDto;

    return this.taskTemplateService.createTemplateWithSnapshot({
      name,
      description,
      taskType: task_type,
      currentSchema: schema,
      studioId,
    });
  }

  @Patch(':id')
  @ZodResponse(taskTemplateDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
    @Body() updateStudioTaskTemplateDto: UpdateStudioTaskTemplateDto,
  ) {
    const { name, description, task_type, schema, version } = updateStudioTaskTemplateDto;

    return this.taskTemplateService.updateTemplateWithSnapshot(
      id,
      studioId,
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
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async delete(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
  ) {
    await this.taskTemplateService.softDelete({ uid: id, studio: { uid: studioId }, deletedAt: null });
  }
}
