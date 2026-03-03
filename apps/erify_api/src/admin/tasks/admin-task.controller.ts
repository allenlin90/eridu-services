import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import {
  ListMyTasksQueryDto,
  ReassignTaskDto,
  ReassignTaskShowDto,
  taskDto,
  taskWithRelationsDto,
  UpdateTaskDto,
} from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';

@Controller('admin/tasks')
export class AdminTaskController extends BaseAdminController {
  constructor(
    private readonly taskService: TaskService,
    private readonly userService: UserService,
    private readonly studioMembershipService: StudioMembershipService,
  ) {
    super();
  }

  @Get()
  @AdminPaginatedResponse(taskWithRelationsDto, 'List of tasks with pagination and filtering')
  async getTasks(@Query() query: ListMyTasksQueryDto) {
    const { items, total } = await this.taskService.findTasks(query);
    return this.createPaginatedResponse(items, total, this.toPaginationQuery(query));
  }

  @Get(':id')
  @AdminResponse(taskWithRelationsDto, HttpStatus.OK, 'Task details')
  async getTask(
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task'))
    id: string,
  ) {
    const task = await this.taskService.findByUidWithRelationsAdmin(id);
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }

  @Patch(':id/assign')
  @AdminResponse(taskDto, HttpStatus.OK, 'Task assignee updated successfully')
  async reassignTask(
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task'))
    id: string,
    @Body() body: ReassignTaskDto,
  ) {
    const task = await this.taskService.findByUid(id);
    this.ensureResourceExists(task, 'Task', id);

    if (body.assignee_uid === null) {
      return this.taskService.setAssignee(id, null);
    }

    if (!task.studioId) {
      throw HttpError.badRequest('Task has no studio scope and cannot be assigned');
    }

    const user = await this.userService.getUserById(body.assignee_uid);
    this.ensureResourceExists(user, 'User', body.assignee_uid);

    const hasMembership = await this.studioMembershipService.hasUserMembershipInStudio(
      body.assignee_uid,
      task.studioId,
    );

    if (!hasMembership) {
      throw HttpError.badRequest(
        `User ${body.assignee_uid} is not a member of task studio`,
      );
    }

    return this.taskService.setAssignee(id, user.id);
  }

  @Patch(':id/reassign-show')
  @AdminResponse(taskDto, HttpStatus.OK, 'Task show target updated successfully')
  async reassignTaskShow(
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task'))
    id: string,
    @Body() body: ReassignTaskShowDto,
  ) {
    const updated = await this.taskService.reassignTaskToShowAsAdmin(id, body.show_uid);
    this.ensureResourceExists(updated, 'Task', id);
    return updated;
  }

  @Patch(':id')
  @AdminResponse(taskDto, HttpStatus.OK, 'Task updated successfully')
  async updateTask(
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task'))
    id: string,
    @Body() body: UpdateTaskDto,
  ) {
    if (body.content !== undefined || body.status !== undefined) {
      throw HttpError.badRequest('System admin cannot edit task content or status');
    }

    if (body.due_date === undefined) {
      throw HttpError.badRequest('No updatable fields provided');
    }

    const dueDate = body.due_date === null ? null : new Date(body.due_date);
    const updated = await this.taskService.updateTaskContentAndStatusAsAdmin(id, body.version, {
      dueDate,
    });
    this.ensureResourceExists(updated, 'Task', id);
    return updated;
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteTask(
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task'))
    id: string,
  ) {
    const task = await this.taskService.findByUid(id);
    this.ensureResourceExists(task, 'Task', id);
    await this.taskService.softDelete({ uid: id });
  }
}
