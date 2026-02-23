import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  AssignShowsDto,
  assignShowsResponseSchema,
  BulkDeleteTasksDto,
  bulkDeleteTasksResponseSchema,
  GenerateTasksDto,
  generateTasksResponseSchema,
  ReassignTaskDto,
  taskDto,
  UpdateTaskDto,
} from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

@ApiTags('Studio Tasks')
@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/tasks')
export class StudioTaskController extends BaseStudioController {
  constructor(
    private readonly taskOrchestrationService: TaskOrchestrationService,
    private readonly taskService: TaskService,
  ) {
    super();
  }

  @ApiOperation({ summary: 'Generate tasks for multiple shows from selected templates' })
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse(generateTasksResponseSchema)
  async generate(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: GenerateTasksDto,
  ) {
    return this.taskOrchestrationService.generateTasksForShows(studioId, dto.show_uids, dto.template_uids);
  }

  @ApiOperation({ summary: 'Assign all tasks for selected shows to a studio member' })
  @Post('assign-shows')
  @HttpCode(HttpStatus.OK)
  @ZodResponse(assignShowsResponseSchema)
  async assignShows(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: AssignShowsDto,
  ) {
    return this.taskOrchestrationService.assignShowsToUser(studioId, dto.show_uids, dto.assignee_uid);
  }

  @ApiOperation({ summary: 'Reassign a single task to a different studio member' })
  @Patch(':id/assign')
  @ZodResponse(taskDto)
  async reassign(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: ReassignTaskDto,
  ) {
    return this.taskOrchestrationService.reassignTask(studioId, id, dto.assignee_uid);
  }

  @ApiOperation({ summary: 'Update task content and/or status (with optimistic locking)' })
  @Patch(':id')
  @ZodResponse(taskDto)
  async updateTask(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    // 1. Verify existence and studio scoping (query-based)
    const existingTask = await this.taskService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    });
    this.ensureResourceExists(existingTask, 'Task', id);

    // 2. Perform operation
    const updatedTask = await this.taskService.updateTaskContentAndStatus(id, dto.version, {
      content: dto.content,
      status: dto.status,
    });

    this.ensureResourceExists(updatedTask, 'Task', id);
    return updatedTask;
  }

  @ApiOperation({ summary: 'Soft-delete multiple tasks by UID' })
  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ZodResponse(bulkDeleteTasksResponseSchema)
  async bulkDelete(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: BulkDeleteTasksDto,
  ) {
    return this.taskOrchestrationService.bulkDeleteTasks(studioId, dto.task_uids);
  }
}
