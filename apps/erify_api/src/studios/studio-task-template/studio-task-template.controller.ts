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
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  CreateStudioTaskTemplateDto,
  ListTaskTemplatesQueryDto,
  taskTemplateDto,
  UpdateStudioTaskTemplateDto,
} from '@/models/task-template/schemas/task-template.schema';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/task-templates')
export class StudioTaskTemplateController extends BaseStudioController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {
    super();
  }

  @Get()
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
      studioUid: studioId,
      orderBy: query.sort ?? 'desc',
    });

    return this.createPaginatedResponse(data, total, query);
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
    const { name, description, schema } = createStudioTaskTemplateDto;

    return this.taskTemplateService.createTemplateWithSnapshot({
      name,
      description,
      currentSchema: schema,
      studio: { connect: { uid: studioId } },
    });
  }

  @Patch(':id')
  @ZodResponse(taskTemplateDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
    @Body() updateStudioTaskTemplateDto: UpdateStudioTaskTemplateDto,
  ) {
    const { name, description, schema, version } = updateStudioTaskTemplateDto;

    return this.taskTemplateService.updateTemplateWithSnapshot(
      { uid: id, version, studio: { uid: studioId } },
      {
        name,
        description,
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
