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
import { ShowService } from '@/models/show/show.service';
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
  constructor(
    private readonly taskTemplateService: TaskTemplateService,
    private readonly showService: ShowService,
  ) {
    super();
  }

  // Mirrors StudioClientMechanicController.ensureStudioClientLinkage (PR 20.3):
  // a mechanic-bearing template binds to one client, so the studio must have
  // at least one active show for that client before the binding is allowed —
  // otherwise the template's clientId could scope a catalog the studio has
  // no actual relationship with.
  private async ensureStudioClientLinkage(studioId: string, clientId: string): Promise<void> {
    const count = await this.showService.countShows({
      studio: { uid: studioId },
      client: { uid: clientId },
      deletedAt: null,
    });
    if (count === 0) {
      throw HttpError.forbidden('Studio not linked to client');
    }
  }

  @Get()
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ACCOUNT_MANAGER])
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
      clientUid: query.clientUid,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get(':id')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ACCOUNT_MANAGER])
  @ZodResponse(taskTemplateDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    }, { client: true });

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
    const { name, description, task_type, schema, client_id } = createStudioTaskTemplateDto;

    if (client_id) {
      await this.ensureStudioClientLinkage(studioId, client_id);
    }

    return this.taskTemplateService.createTemplateWithSnapshot({
      name,
      description,
      taskType: task_type,
      currentSchema: schema,
      studioId,
      clientUid: client_id,
    });
  }

  @Patch(':id')
  @ZodResponse(taskTemplateDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
    @Body() updateStudioTaskTemplateDto: UpdateStudioTaskTemplateDto,
  ) {
    const { name, description, task_type, schema, version, client_id } = updateStudioTaskTemplateDto;

    if (client_id) {
      await this.ensureStudioClientLinkage(studioId, client_id);
    }

    return this.taskTemplateService.updateTemplateWithSnapshot(
      id,
      studioId,
      {
        name,
        description,
        taskType: task_type,
        currentSchema: schema,
        version,
        clientUid: client_id,
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
