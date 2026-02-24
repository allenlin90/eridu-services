import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  TASK_ACTION,
  TASK_STATUS,
  type TaskAction,
  type TaskStatus,
} from '@eridu/api-types/task-management';

import { BaseStudioController } from '../base-studio.controller';

import type { AuthenticatedRequest } from '@/lib/auth/jwt-auth.guard';
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
  TaskActionDto,
  taskDto,
  taskWithRelationsDto,
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
    return this.taskOrchestrationService.generateTasksForShows(
      studioId,
      dto.show_uids,
      dto.template_uids,
      dto.due_dates,
    );
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

  @ApiOperation({ summary: 'Get task details (including schema) for studio workflow actions' })
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @Get(':id')
  @ZodResponse(taskWithRelationsDto)
  async getTask(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
  ) {
    const scoped = await this.taskService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    });
    this.ensureResourceExists(scoped, 'Task', id);

    const task = await this.taskService.findByUidWithRelationsAdmin(id);
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }

  @ApiOperation({ summary: 'Update task content and/or status (with optimistic locking)' })
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @Patch(':id')
  @ZodResponse(taskDto)
  async updateTask(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: UpdateTaskDto,
    @Req() request: AuthenticatedRequest,
  ) {
    // 1. Verify existence and studio scoping (query-based)
    const existingTask = await this.taskService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    });
    this.ensureResourceExists(existingTask, 'Task', id);

    // 2. Perform operation
    const updatedTask = await this.taskService.updateTaskContentAndStatusAsAdmin(id, dto.version, {
      content: dto.content,
      status: dto.status,
    }, {
      actorExtId: request.user?.ext_id,
      actorEmail: request.user?.email,
      actorRole: request.studioMembership?.role,
      source: 'studio',
    });

    this.ensureResourceExists(updatedTask, 'Task', id);
    return updatedTask;
  }

  @ApiOperation({ summary: 'Run action-based task workflow command (studio manager/admin)' })
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @Patch(':id/action')
  @ZodResponse(taskDto)
  async runTaskAction(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: TaskActionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const existingTask = await this.taskService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    });
    this.ensureResourceExists(existingTask, 'Task', id);

    const status = this.resolveStudioActionStatus(dto.action);
    const updatedTask = await this.taskService.updateTaskContentAndStatusAsAdmin(id, dto.version, {
      content: dto.content,
      status,
    }, {
      actorExtId: request.user?.ext_id,
      actorEmail: request.user?.email,
      actorRole: request.studioMembership?.role,
      source: 'studio',
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

  private resolveStudioActionStatus(action: TaskAction): TaskStatus | undefined {
    switch (action) {
      case TASK_ACTION.SAVE_CONTENT:
        return undefined;
      case TASK_ACTION.START_WORK:
      case TASK_ACTION.CONTINUE_EDITING:
      case TASK_ACTION.REOPEN_TASK:
        return TASK_STATUS.IN_PROGRESS;
      case TASK_ACTION.SUBMIT_FOR_REVIEW:
        return TASK_STATUS.REVIEW;
      case TASK_ACTION.MARK_BLOCKED:
        return TASK_STATUS.BLOCKED;
      case TASK_ACTION.APPROVE_COMPLETED:
        return TASK_STATUS.COMPLETED;
      case TASK_ACTION.CLOSE_TASK:
        return TASK_STATUS.CLOSED;
      default:
        return undefined;
    }
  }
}
