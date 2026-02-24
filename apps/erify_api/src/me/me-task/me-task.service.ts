import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

import {
  type ListMyTasksQueryTransformed,
  TASK_ACTION,
  type TaskAction,
} from '@eridu/api-types/task-management';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import type { TaskActionPayload, UpdateTaskPayload } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';

@Injectable()
export class MeTaskService {
  constructor(
    private readonly taskService: TaskService,
    private readonly userService: UserService,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Retrieves a paginated list of tasks assigned to the current user.
   */
  async listMyTasks(userExtId: string, query: ListMyTasksQueryTransformed) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    let resolvedStudioId: bigint | undefined;
    if (query.studio_id) {
      const studio = await this.studioService.findByUid(query.studio_id);
      if (!studio) {
        throw HttpError.notFound('Studio not found');
      }
      resolvedStudioId = studio.id;
    }

    return this.taskService.findTasksByAssignee(user.id, query, resolvedStudioId);
  }

  /**
   * Retrieves a specific task assigned to the current user.
   */
  async getMyTask(userExtId: string, taskUid: string) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    const task = await this.taskService.findByUidWithRelations(taskUid, user.id);

    if (!task) {
      throw HttpError.notFound('Task not found or not assigned to you');
    }

    return task;
  }

  /**
   * Updates an assigned task for the currently logged-in user.
   */
  async updateMyTask(
    userExtId: string,
    taskUid: string,
    version: number,
    payload: UpdateTaskPayload,
  ) {
    // 1. Resolve user ID from ext_id
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    // 2. Resolve task and verify assignment
    const task = await this.taskService.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task not found or not assigned to you');
    }

    if (task.assigneeId !== user.id) {
      throw HttpError.forbidden('Task is not assigned to you');
    }

    if (payload.dueDate !== undefined) {
      throw HttpError.unprocessableEntity('Assignees cannot update task due dates');
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CLOSED) {
      throw HttpError.unprocessableEntity('Completed or closed tasks cannot be edited by assignees');
    }

    if (payload.status && payload.status !== task.status) {
      this.ensureMemberTransitionAllowed(task.status, payload.status);
    }

    // 3. Delegate to TaskService core functionality
    return this.taskService.updateTaskContentAndStatus(taskUid, version, payload);
  }

  async runMyTaskAction(
    userExtId: string,
    taskUid: string,
    version: number,
    payload: TaskActionPayload,
  ) {
    // 1. Resolve user ID from ext_id
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    // 2. Resolve task and verify assignment
    const task = await this.taskService.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task not found or not assigned to you');
    }

    if (task.assigneeId !== user.id) {
      throw HttpError.forbidden('Task is not assigned to you');
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CLOSED) {
      throw HttpError.unprocessableEntity('Completed or closed tasks cannot be edited by assignees');
    }

    const updatePayload = this.resolveMemberAction(
      task.status,
      payload.action,
      payload.content,
      payload.note,
    );
    return this.taskService.updateTaskContentAndStatus(taskUid, version, updatePayload);
  }

  private resolveMemberAction(
    currentStatus: TaskStatus,
    action: TaskAction,
    content?: TaskActionPayload['content'],
    note?: string,
  ): UpdateTaskPayload {
    const basePayload: UpdateTaskPayload = content !== undefined ? { content } : {};
    const notePayload = this.buildNoteMetadata(action, note);
    const combinedPayload = notePayload ? { ...basePayload, ...notePayload } : basePayload;

    switch (action) {
      case TASK_ACTION.SAVE_CONTENT:
        return combinedPayload;
      case TASK_ACTION.START_WORK:
        this.ensureMemberTransitionAllowed(currentStatus, TaskStatus.IN_PROGRESS);
        return { ...combinedPayload, status: TaskStatus.IN_PROGRESS };
      case TASK_ACTION.SUBMIT_FOR_REVIEW:
        this.ensureMemberTransitionAllowed(currentStatus, TaskStatus.REVIEW);
        return { ...combinedPayload, status: TaskStatus.REVIEW };
      case TASK_ACTION.CONTINUE_EDITING:
        this.ensureMemberTransitionAllowed(currentStatus, TaskStatus.IN_PROGRESS);
        return { ...combinedPayload, status: TaskStatus.IN_PROGRESS };
      case TASK_ACTION.MARK_BLOCKED:
        this.ensureMemberTransitionAllowed(currentStatus, TaskStatus.BLOCKED);
        return { ...combinedPayload, status: TaskStatus.BLOCKED };
      default:
        throw HttpError.unprocessableEntity(`Action ${action} is not allowed for assignees`);
    }
  }

  private buildNoteMetadata(action: TaskAction, note?: string): UpdateTaskPayload | null {
    if (!note)
      return null;

    if (action === TASK_ACTION.CONTINUE_EDITING) {
      return {
        metadata: {
          rejection_note: note,
          blocked_reason: null,
        },
      };
    }

    if (action === TASK_ACTION.MARK_BLOCKED) {
      return {
        metadata: {
          blocked_reason: note,
        },
      };
    }

    return null;
  }

  private ensureMemberTransitionAllowed(from: TaskStatus, to: TaskStatus) {
    const allowedTransitions = new Set<string>([
      `${TaskStatus.PENDING}->${TaskStatus.IN_PROGRESS}`,
      `${TaskStatus.PENDING}->${TaskStatus.REVIEW}`,
      `${TaskStatus.PENDING}->${TaskStatus.BLOCKED}`,
      `${TaskStatus.IN_PROGRESS}->${TaskStatus.REVIEW}`,
      `${TaskStatus.IN_PROGRESS}->${TaskStatus.BLOCKED}`,
      `${TaskStatus.REVIEW}->${TaskStatus.IN_PROGRESS}`,
      `${TaskStatus.REVIEW}->${TaskStatus.BLOCKED}`,
      `${TaskStatus.BLOCKED}->${TaskStatus.IN_PROGRESS}`,
    ]);

    if (!allowedTransitions.has(`${from}->${to}`)) {
      throw HttpError.unprocessableEntity(
        `Invalid status transition for assignee: ${from} -> ${to}`,
      );
    }
  }
}
