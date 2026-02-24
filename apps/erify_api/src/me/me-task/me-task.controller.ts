import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { MeTaskService } from './me-task.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { BaseController } from '@/lib/controllers/base.controller';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  ListMyTasksQueryDto,
  TaskActionDto,
  taskDto,
  taskWithRelationsDto,
  UpdateTaskDto,
} from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';

/**
 * Me Task Controller
 *
 * User-scoped endpoints for operators to manage their assigned tasks.
 */
@Controller('me/tasks')
export class MeTaskController extends BaseController {
  constructor(private readonly meTaskService: MeTaskService) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(taskWithRelationsDto)
  async listTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyTasksQueryDto,
  ) {
    const { items, total } = await this.meTaskService.listMyTasks(user.ext_id, query);
    return this.createPaginatedResponse(items, total, query);
  }

  @Get(':id')
  @ZodResponse(taskWithRelationsDto)
  async getTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
  ) {
    const task = await this.meTaskService.getMyTask(user.ext_id, id);
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }

  @Patch(':id')
  @ZodResponse(taskDto)
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.meTaskService.updateMyTask(user.ext_id, id, dto.version, {
      content: dto.content,
      status: dto.status,
    });
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }

  @Patch(':id/action')
  @ZodResponse(taskDto)
  async runTaskAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: TaskActionDto,
  ) {
    const task = await this.meTaskService.runMyTaskAction(user.ext_id, id, dto.version, {
      action: dto.action,
      content: dto.content,
    });
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }
}
