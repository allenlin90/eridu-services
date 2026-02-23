import { Injectable } from '@nestjs/common';

import type { ListMyTasksQueryTransformed } from '@eridu/api-types/task-management';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import type { UpdateTaskPayload } from '@/models/task/schemas/task.schema';
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

    const task = await this.taskService.findOne({
      uid: taskUid,
      deletedAt: null,
      assigneeId: user.id, // Enforce assignee ownership at query level
    }, {
      template: true,
      snapshot: {
        select: {
          schema: true,
          version: true,
        },
      },
      assignee: true,
      targets: {
        where: { targetType: 'SHOW', deletedAt: null },
        include: { show: true },
      },
    });

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

    // 3. Delegate to TaskService core functionality
    return this.taskService.updateTaskContentAndStatus(taskUid, version, payload);
  }
}
