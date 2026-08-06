import type { TaskForCoverage } from './show-task-coverage.util';
import { computeShowTaskCoverage, isModerationTask, mapTasksByShowId } from './show-task-coverage.util';

import type { TaskService } from '@/models/task/task.service';

function task(overrides: Partial<TaskForCoverage> = {}): TaskForCoverage {
  return { type: 'SETUP', assigneeId: BigInt(1), template: null, ...overrides };
}

describe('showTaskCoverage', () => {
  describe('computeShowTaskCoverage', () => {
    it('reports every required stage missing when the show has no tasks', () => {
      const coverage = computeShowTaskCoverage([], 'standard');

      expect(coverage.hasNoTasks).toBe(true);
      expect(coverage.missingRequiredTaskTypes).toEqual(['SETUP', 'CLOSURE']);
      expect(coverage.unassignedTaskCount).toBe(0);
    });

    it('reports full coverage for a standard show with SETUP and CLOSURE assigned', () => {
      const coverage = computeShowTaskCoverage(
        [task({ type: 'SETUP' }), task({ type: 'CLOSURE' })],
        'standard',
      );

      expect(coverage).toEqual({
        hasNoTasks: false,
        unassignedTaskCount: 0,
        missingRequiredTaskTypes: [],
        missingModerationTask: false,
      });
    });

    it('counts tasks with no assignee', () => {
      const coverage = computeShowTaskCoverage(
        [task({ type: 'SETUP' }), task({ type: 'CLOSURE', assigneeId: null })],
        'standard',
      );

      expect(coverage.unassignedTaskCount).toBe(1);
    });

    it('requires a moderation task for premium shows only', () => {
      const tasks = [task({ type: 'SETUP' }), task({ type: 'CLOSURE' })];

      expect(computeShowTaskCoverage(tasks, 'standard').missingModerationTask).toBe(false);
      expect(computeShowTaskCoverage(tasks, 'premium').missingModerationTask).toBe(true);
      expect(computeShowTaskCoverage(tasks, 'PREMIUM').missingModerationTask).toBe(true);
    });

    it('satisfies the premium moderation requirement with an ACTIVE task carrying loops', () => {
      const coverage = computeShowTaskCoverage(
        [
          task({ type: 'SETUP' }),
          task({ type: 'CLOSURE' }),
          task({ type: 'ACTIVE', template: { currentSchema: { metadata: { loops: [{}] } } } }),
        ],
        'premium',
      );

      expect(coverage.missingModerationTask).toBe(false);
    });
  });

  describe('isModerationTask', () => {
    it('requires an ACTIVE task with at least one template loop', () => {
      const loops = { currentSchema: { metadata: { loops: [{}] } } };

      expect(isModerationTask(task({ type: 'ACTIVE', template: loops }))).toBe(true);
      expect(isModerationTask(task({ type: 'SETUP', template: loops }))).toBe(false);
      expect(isModerationTask(task({ type: 'ACTIVE', template: null }))).toBe(false);
      expect(
        isModerationTask(task({ type: 'ACTIVE', template: { currentSchema: { metadata: { loops: [] } } } })),
      ).toBe(false);
    });
  });

  describe('mapTasksByShowId', () => {
    const taskServiceMock = { findTasksByShowIds: jest.fn() };
    const taskService = taskServiceMock as unknown as TaskService;

    beforeEach(() => {
      taskServiceMock.findTasksByShowIds.mockReset();
    });

    it('returns an empty map without querying when no show ids are given', async () => {
      const map = await mapTasksByShowId(taskService, []);

      expect(map.size).toBe(0);
      expect(taskServiceMock.findTasksByShowIds).not.toHaveBeenCalled();
    });

    it('indexes a task under every live SHOW target it carries', async () => {
      const multiShowTask = {
        ...task(),
        targets: [
          { targetType: 'SHOW', deletedAt: null, showId: BigInt(1) },
          { targetType: 'SHOW', deletedAt: null, showId: BigInt(2) },
        ],
      };
      taskServiceMock.findTasksByShowIds.mockResolvedValue([multiShowTask]);

      const map = await mapTasksByShowId(taskService, [BigInt(1), BigInt(2)]);

      expect(map.get(BigInt(1))).toHaveLength(1);
      expect(map.get(BigInt(2))).toHaveLength(1);
    });

    it('ignores soft-deleted targets and non-SHOW targets', async () => {
      taskServiceMock.findTasksByShowIds.mockResolvedValue([
        {
          ...task(),
          targets: [
            { targetType: 'SHOW', deletedAt: new Date(), showId: BigInt(1) },
            { targetType: 'CREATOR', deletedAt: null, showId: BigInt(1) },
          ],
        },
      ]);

      const map = await mapTasksByShowId(taskService, [BigInt(1)]);

      expect(map.has(BigInt(1))).toBe(false);
    });
  });
});
