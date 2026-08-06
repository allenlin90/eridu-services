import { Injectable } from '@nestjs/common';

import {
  LIFECYCLE_CONDITION_STATUS,
  LIFECYCLE_READINESS_PHASE,
  PLANNING_READINESS_CONDITION_KEY,
} from '@eridu/api-types/shows';

import { HttpError } from '@/lib/errors/http-error.util';
import { ShowService } from '@/models/show/show.service';
import { TaskService } from '@/models/task/task.service';
import { computeShowTaskCoverage, mapTasksByShowId } from '@/show-orchestration/show-task-coverage.util';

// Shared with `PlanningReadinessQueryDto` — the DTO validates this cap at the
// transport boundary, the service enforces the same cap for callers (e.g. MCP
// queries) that bypass the HTTP DTO.
export const PLANNING_READINESS_MAX_BULK_SHOW_IDS = 100;

type LifecycleConditionStatus = (typeof LIFECYCLE_CONDITION_STATUS)[keyof typeof LIFECYCLE_CONDITION_STATUS];

export type PlanningReadinessCondition = {
  key: string;
  label: string;
  status: LifecycleConditionStatus;
};

export type PlanningReadinessResult = {
  phase: typeof LIFECYCLE_READINESS_PHASE.PLANNING_READINESS;
  showUid: string;
  showName: string;
  conditions: PlanningReadinessCondition[];
  metCount: number;
  totalCount: number;
  isReady: boolean;
};

type ShowWithReadinessContext = {
  id: bigint;
  uid: string;
  name: string;
  studioRoomId: bigint | null;
  showStandard: { name: string } | null;
  showCreators: unknown[];
  showPlatforms: unknown[];
};

function condition(key: string, label: string, met: boolean): PlanningReadinessCondition {
  return { key, label, status: met ? LIFECYCLE_CONDITION_STATUS.MET : LIFECYCLE_CONDITION_STATUS.NOT_MET };
}

/**
 * Item 11 — advisory planning readiness checklist. Aggregates existing
 * planning signals (room, creators, platforms, generated task stages,
 * task assignment) into the shared lifecycle condition contract so item 12's
 * completion checklist and item 19's future enforcement engine consume one
 * schema. Purely advisory: never blocks a transition.
 */
@Injectable()
export class PlanningReadinessService {
  constructor(
    private readonly showService: ShowService,
    private readonly taskService: TaskService,
  ) {}

  async getPlanningReadinessForShow(studioUid: string, showUid: string): Promise<PlanningReadinessResult> {
    const [result] = await this.getPlanningReadinessForShowIds(studioUid, [showUid]);
    if (!result) {
      throw HttpError.notFound('Show', showUid);
    }
    return result;
  }

  async getPlanningReadinessForShowIds(studioUid: string, showUids: string[]): Promise<PlanningReadinessResult[]> {
    if (showUids.length === 0) {
      return [];
    }
    if (showUids.length > PLANNING_READINESS_MAX_BULK_SHOW_IDS) {
      throw HttpError.badRequest(`Too many show_id values (max ${PLANNING_READINESS_MAX_BULK_SHOW_IDS})`);
    }

    const shows = (await this.showService.findMany({
      where: {
        studio: { uid: studioUid, deletedAt: null },
        deletedAt: null,
        uid: { in: showUids },
      },
      include: {
        showStandard: true,
        showCreators: { where: { deletedAt: null } },
        showPlatforms: { where: { deletedAt: null } },
      },
    })) as unknown as ShowWithReadinessContext[];

    if (shows.length === 0) {
      return [];
    }

    const taskMapByShowId = await mapTasksByShowId(this.taskService, shows.map((show) => show.id));
    const resultByUid = new Map<string, PlanningReadinessResult>();

    for (const show of shows) {
      const tasks = taskMapByShowId.get(show.id) ?? [];
      const coverage = computeShowTaskCoverage(tasks, show.showStandard?.name ?? 'standard');

      const conditions: PlanningReadinessCondition[] = [
        condition(PLANNING_READINESS_CONDITION_KEY.ROOM_ASSIGNED, 'Room assigned', show.studioRoomId !== null),
        condition(PLANNING_READINESS_CONDITION_KEY.CREATORS_ASSIGNED, 'Creators assigned', show.showCreators.length > 0),
        condition(PLANNING_READINESS_CONDITION_KEY.PLATFORMS_ASSIGNED, 'Platforms assigned', show.showPlatforms.length > 0),
        condition(
          PLANNING_READINESS_CONDITION_KEY.TASK_STAGES_GENERATED,
          'Required task stages generated',
          !coverage.hasNoTasks && coverage.missingRequiredTaskTypes.length === 0 && !coverage.missingModerationTask,
        ),
        condition(
          PLANNING_READINESS_CONDITION_KEY.TASKS_ASSIGNED,
          'Required tasks assigned to operators',
          !coverage.hasNoTasks && coverage.unassignedTaskCount === 0,
        ),
      ];
      const metCount = conditions.filter((c) => c.status === LIFECYCLE_CONDITION_STATUS.MET).length;

      resultByUid.set(show.uid, {
        phase: LIFECYCLE_READINESS_PHASE.PLANNING_READINESS,
        showUid: show.uid,
        showName: show.name,
        conditions,
        metCount,
        totalCount: conditions.length,
        isReady: metCount === conditions.length,
      });
    }

    return showUids
      .map((uid) => resultByUid.get(uid))
      .filter((result): result is PlanningReadinessResult => Boolean(result));
  }
}
