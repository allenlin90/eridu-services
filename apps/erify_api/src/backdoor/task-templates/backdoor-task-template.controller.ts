import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { BaseBackdoorController } from '@/backdoor/base-backdoor.controller';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  CreateStudioTaskTemplateDto,
  taskTemplateDto,
} from '@/models/task-template/schemas/task-template.schema';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

@Controller('backdoor/studios/:studioId/task-templates')
@UseGuards(BackdoorApiKeyGuard)
export class BackdoorTaskTemplateController extends BaseBackdoorController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {
    super();
  }

  @Post()
  @ZodResponse(taskTemplateDto, HttpStatus.CREATED)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioId: string,
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
}
