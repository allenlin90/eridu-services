import type { TaskService } from '@/models/task/task.service';

// Required coverage baseline:
// - Standard shows: SETUP + CLOSURE
// - Premium shows: SETUP + CLOSURE + moderation task
export const REQUIRED_SHOW_TASK_TYPES = ['SETUP', 'CLOSURE'] as const;
export type RequiredTaskType = (typeof REQUIRED_SHOW_TASK_TYPES)[number];

// Convention: shows whose standard name equals this value require a moderation task.
export const PREMIUM_SHOW_STANDARD_NAME = 'premium';

export type TaskForCoverage = {
  type: string;
  assigneeId: bigint | null;
  template: { currentSchema: unknown } | null;
};

export type TaskTargetForCoverage = TaskForCoverage & {
  targets: Array<{ targetType: string; deletedAt: Date | null; showId: bigint | null }> | null;
};

export type ShowTaskCoverage = {
  hasNoTasks: boolean;
  unassignedTaskCount: number;
  missingRequiredTaskTypes: RequiredTaskType[];
  missingModerationTask: boolean;
};

export function isModerationTask(task: TaskForCoverage): boolean {
  if (task.type !== 'ACTIVE') {
    return false;
  }

  const schema = task.template?.currentSchema as { metadata?: { loops?: unknown[] } } | null;
  const loops = schema?.metadata?.loops;
  return Array.isArray(loops) && loops.length > 0;
}

/**
 * Evaluates required task-stage coverage and assignment for a single show
 * against its already-loaded tasks. Shared by shift-alignment's per-show
 * planning-risk warnings and the planning-readiness checklist so the two
 * surfaces cannot silently drift on what "ready" means.
 */
export function computeShowTaskCoverage(tasks: TaskForCoverage[], showStandardName: string): ShowTaskCoverage {
  const hasNoTasks = tasks.length === 0;
  const unassignedTaskCount = tasks.filter((task) => task.assigneeId === null).length;
  const missingRequiredTaskTypes = hasNoTasks
    ? REQUIRED_SHOW_TASK_TYPES.map((type) => type as RequiredTaskType)
    : (() => {
        const presentTypes = new Set(tasks.map((task) => task.type));
        return REQUIRED_SHOW_TASK_TYPES
          .filter((requiredType) => !presentTypes.has(requiredType))
          .map((type) => type as RequiredTaskType);
      })();

  const isPremiumShow = showStandardName.toLowerCase() === PREMIUM_SHOW_STANDARD_NAME;
  const hasModerationTask = tasks.some((task) => isModerationTask(task));
  const missingModerationTask = isPremiumShow && !hasModerationTask;

  return { hasNoTasks, unassignedTaskCount, missingRequiredTaskTypes, missingModerationTask };
}

/**
 * Loads tasks for the given show ids and maps them by show id via their
 * SHOW-type targets. A task can carry multiple targets, so this is not a
 * simple `findTasksByShowIds` group-by.
 */
export async function mapTasksByShowId(
  taskService: TaskService,
  showIds: bigint[],
): Promise<Map<bigint, TaskTargetForCoverage[]>> {
  const map = new Map<bigint, TaskTargetForCoverage[]>();
  if (showIds.length === 0) {
    return map;
  }

  const tasks = await taskService.findTasksByShowIds(showIds, {
    targets: true,
    template: true,
  });

  for (const task of tasks as unknown as TaskTargetForCoverage[]) {
    for (const target of task.targets ?? []) {
      if (target.targetType !== 'SHOW' || target.deletedAt || !target.showId) {
        continue;
      }

      if (!map.has(target.showId)) {
        map.set(target.showId, []);
      }
      map.get(target.showId)!.push(task);
    }
  }

  return map;
}
