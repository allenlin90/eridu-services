import { Injectable } from '@nestjs/common';

import type { MembershipWithUser } from './task-orchestration.types';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

/** Task assignment: bulk show→user assignment and single-task reassignment. */
@Injectable()
export class TaskAssignmentService {
  constructor(
    private readonly taskService: TaskService,
    private readonly showService: ShowService,
    private readonly studioService: StudioService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly taskTargetService: TaskTargetService,
  ) {}

  /**
   * Resolves a studio member by user UID, throwing if not found. Filters by
   * user UID in the query rather than loading every membership and finding
   * in memory.
   */
  private async resolveStudioMember(
    studioUid: string,
    assigneeUid: string,
  ): Promise<MembershipWithUser> {
    const { data: memberships } = await this.studioMembershipService.listStudioMemberships(
      { studioId: studioUid, userUid: assigneeUid },
      { user: true },
    );
    const membership = (memberships as MembershipWithUser[])[0];
    if (!membership) {
      throw HttpError.badRequest(`User ${assigneeUid} is not a member of studio ${studioUid}`);
    }
    return membership;
  }

  /**
   * Assigns all tasks of selected shows to a specific user.
   */
  async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
    // 1. Validate assignee is a studio member
    const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);

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

    // 3. Find task-target links for these shows (explicitly captures shows with/without generated tasks)
    const taskTargets = await this.taskTargetService.findByShowIds(showIds);
    const taskIds = [...new Set(taskTargets.map((t) => t.taskId))];
    const showsWithTasks = new Set(taskTargets.map((tt) => tt.showId).filter((id): id is bigint => id !== null));
    const showsWithoutTasks = shows
      .filter((show) => !showsWithTasks.has(show.id))
      .map((show) => show.uid);

    if (taskIds.length === 0) {
      return {
        updated_count: 0,
        shows: shows.map((s) => s.uid),
        show_count: shows.length,
        shows_with_tasks_count: 0,
        shows_without_tasks: showsWithoutTasks,
        assignee: {
          id: assigneeMembership.user.uid,
          name: assigneeMembership.user.name,
        },
      };
    }

    // 4. Bulk update assignee
    const result = await this.taskService.updateAssigneeByTaskIds(taskIds, assigneeMembership.userId);

    return {
      updated_count: result.count,
      shows: shows.map((s) => s.uid),
      show_count: shows.length,
      shows_with_tasks_count: shows.length - showsWithoutTasks.length,
      shows_without_tasks: showsWithoutTasks,
      assignee: {
        id: assigneeMembership.user.uid,
        name: assigneeMembership.user.name,
      },
    };
  }

  /**
   * Reassigns a single task to a user or unassigns it.
   */
  async reassignTask(studioUid: string, taskUid: string, assigneeUid: string | null) {
    const task = await this.taskService.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    // Verify studio scope
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || task.studioId !== studio.id) {
      throw HttpError.forbidden('Task does not belong to this studio');
    }

    let assigneeUserId: bigint | null = null;

    if (assigneeUid) {
      const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);
      assigneeUserId = assigneeMembership.userId;
    }

    return this.taskService.setAssignee(taskUid, assigneeUserId, { assignee: true, template: true });
  }
}
