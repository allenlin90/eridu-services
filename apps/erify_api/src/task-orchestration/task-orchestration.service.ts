import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';

import { TaskGenerationProcessor } from './task-generation-processor.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

@Injectable()
export class TaskOrchestrationService {
  private readonly logger = new Logger(TaskOrchestrationService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly taskTargetService: TaskTargetService,
    private readonly taskTemplateService: TaskTemplateService,
    private readonly showService: ShowService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly taskGenerationProcessor: TaskGenerationProcessor,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Generates tasks for multiple shows based on a set of templates.
   * Idempotent per show-template pair.
   */
  async generateTasksForShows(
    studioUid: string,
    showUids: string[],
    templateUids: string[],
  ) {
    // 1. Resolve studio and validate templates
    const templates = await this.taskTemplateService.findAll({
      where: {
        uid: { in: templateUids },
        studio: { uid: studioUid },
        isActive: true,
      },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (templates.length === 0) {
      throw HttpError.badRequest('No valid active templates found for the provided UIDs');
    }

    // 2. Resolve shows and validate they belong to the studio
    const shows = await this.showService.findMany({
      where: {
        uid: { in: showUids },
        studio: { uid: studioUid },
        deletedAt: null,
      },
    });

    if (shows.length === 0) {
      throw HttpError.badRequest('No valid shows found for the provided UIDs');
    }

    const results: any[] = [];
    let totalTasksCreated = 0;
    let totalSkipped = 0;

    // 3. Process shows
    for (const show of shows) {
      const showResult = await this.taskGenerationProcessor.processShow(show, templates);
      results.push(showResult);

      if (showResult.status === 'success' || showResult.status === 'skipped') {
        totalTasksCreated += showResult.tasks_created;
        totalSkipped += showResult.tasks_skipped;
      }
    }

    return {
      results,
      summary: {
        shows_processed: shows.length,
        total_tasks_created: totalTasksCreated,
        total_skipped: totalSkipped,
      },
    };
  }

  /**
   * Assigns all tasks of selected shows to a specific user.
   */
  async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
    // 1. Validate assignee is a studio member
    const { data: memberships } = await this.studioMembershipService.listStudioMemberships(
      { studioId: studioUid },
      { user: true },
    );
    const assigneeMembership: any = memberships.find((m: any) => m.user?.uid === assigneeUid);

    if (!assigneeMembership) {
      throw HttpError.badRequest(`User ${assigneeUid} is not a member of studio ${studioUid}`);
    }

    // 2. Resolve shows
    const shows = await this.showService.findMany({
      where: {
        uid: { in: showUids },
        studio: { uid: studioUid },
        deletedAt: null,
      },
    });

    if (shows.length === 0) {
      throw HttpError.badRequest('No valid shows found');
    }

    const showIds = shows.map((s) => s.id);

    // 3. Find task IDs linked to these shows
    const tasks = await this.taskService.findTasksByShowIds(showIds);
    const taskIds = tasks.map((t) => t.id);

    if (taskIds.length === 0) {
      return {
        updated_count: 0,
        shows: shows.map((s) => s.uid),
        assignee: {
          id: assigneeMembership.user.uid,
          name: assigneeMembership.user.name,
        },
      };
    }

    // 4. Bulk update assignee
    // Note: updateAssigneeByTaskIds is a custom repository method exposed via service
    await this.taskService.updateAssigneeByTaskIds(taskIds, assigneeMembership.userId);

    return {
      updated_count: taskIds.length,
      shows: shows.map((s) => s.uid),
      assignee: {
        id: assigneeMembership.user.uid,
        name: assigneeMembership.user.name,
      },
    };
  }

  /**
   * Reassigns a single task to a user.
   */
  async reassignTask(studioUid: string, taskUid: string, assigneeUid: string) {
    const task = await this.taskService.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    // Verify studio scope (Optimization: check task.studioId vs studio.id if we had studio loaded,
    // but here we look up studio by UID first to be safe or valid)
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || task.studioId !== studio.id) {
      throw HttpError.forbidden('Task does not belong to this studio');
    }

    const { data: memberships } = await this.studioMembershipService.listStudioMemberships(
      { studioId: studioUid },
      { user: true },
    );
    const assigneeMembership: any = memberships.find((m: any) => m.user?.uid === assigneeUid);

    if (!assigneeMembership) {
      throw HttpError.badRequest(`User ${assigneeUid} is not a member of this studio`);
    }

    // Use repository update
    const updatedTask = await this.taskService.update(
      { uid: taskUid },
      { assignee: { connect: { id: assigneeMembership.userId } } },
      { assignee: true, template: true }, // Include relations in return
    );

    return updatedTask;
  }

  /**
   * Gets all tasks for a specific show, ordered by type.
   */
  async getShowTasks(studioUid: string, showUid: string) {
    const show = await this.showService.getShowById(showUid);

    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || show.studioId !== studio.id) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }

    const tasks = await this.taskService.findTasksByShowIds([show.id], {
      assignee: true,
      template: true,
    });

    // Custom sort: SETUP → ACTIVE → CLOSURE → ADMIN → ROUTINE → OTHER
    const typeOrder: Record<TaskType, number> = {
      [TaskType.SETUP]: 1,
      [TaskType.ACTIVE]: 2,
      [TaskType.CLOSURE]: 3,
      [TaskType.ADMIN]: 4,
      [TaskType.ROUTINE]: 5,
      [TaskType.OTHER]: 6,
    };

    return tasks.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
  }

  /**
   * Lists shows for a studio with task completion summaries.
   */
  async getStudioShowsWithTaskSummary(studioUid: string, query: any) {
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    const { data: shows, total } = await this.showService.findPaginatedWithTaskSummary(
      studio.id,
      query,
    );

    const data = shows.map((show) => {
      // prisma include type complexity
      const taskSummaries = show.taskTargets.map((tt) => tt.task);
      return {
        ...show,
        task_summary: {
          total: taskSummaries.length,
          assigned: taskSummaries.filter((t) => t.assigneeId !== null).length,
          unassigned: taskSummaries.filter((t) => t.assigneeId === null).length,
          completed: taskSummaries.filter((t) => t.status === TaskStatus.COMPLETED).length,
        },
      };
    });

    return { data, total };
  }
}
