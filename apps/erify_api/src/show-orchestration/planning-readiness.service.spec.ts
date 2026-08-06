import { PlanningReadinessService } from './planning-readiness.service';

import type { ShowService } from '@/models/show/show.service';
import type { TaskService } from '@/models/task/task.service';

describe('planningReadinessService', () => {
  let service: PlanningReadinessService;
  let showService: { findMany: jest.Mock };
  let taskService: { findTasksByShowIds: jest.Mock };

  const studioUid = 'std_test123';

  beforeEach(() => {
    showService = { findMany: jest.fn() };
    taskService = { findTasksByShowIds: jest.fn().mockResolvedValue([]) };
    service = new PlanningReadinessService(
      showService as unknown as ShowService,
      taskService as unknown as TaskService,
    );
  });

  function mockShow(overrides: Partial<{
    id: bigint;
    uid: string;
    name: string;
    studioRoomId: bigint | null;
    showStandard: { name: string } | null;
    showCreators: unknown[];
    showPlatforms: unknown[];
  }> = {}) {
    return {
      id: BigInt(1),
      uid: 'show_1',
      name: 'Show 1',
      studioRoomId: null,
      showStandard: { name: 'standard' },
      showCreators: [],
      showPlatforms: [],
      ...overrides,
    };
  }

  describe('getPlanningReadinessForShowIds', () => {
    it('returns an empty array without querying when no ids are given', async () => {
      const result = await service.getPlanningReadinessForShowIds(studioUid, []);

      expect(result).toEqual([]);
      expect(showService.findMany).not.toHaveBeenCalled();
    });

    it('rejects more than the bulk id cap', async () => {
      const showIds = Array.from({ length: 101 }, (_, i) => `show_${i}`);

      await expect(service.getPlanningReadinessForShowIds(studioUid, showIds)).rejects.toThrow(
        'Too many show_id values',
      );
    });

    it('flags every condition not_met for a show with nothing set up', async () => {
      showService.findMany.mockResolvedValue([mockShow()]);

      const [result] = await service.getPlanningReadinessForShowIds(studioUid, ['show_1']);

      expect(result.isReady).toBe(false);
      expect(result.metCount).toBe(0);
      expect(result.totalCount).toBe(5);
      expect(result.conditions.map((c) => c.status)).toEqual([
        'not_met',
        'not_met',
        'not_met',
        'not_met',
        'not_met',
      ]);
    });

    it('marks a fully staffed, fully covered standard show as ready', async () => {
      showService.findMany.mockResolvedValue([
        mockShow({
          studioRoomId: BigInt(5),
          showCreators: [{ id: BigInt(1) }],
          showPlatforms: [{ id: BigInt(1) }],
        }),
      ]);
      taskService.findTasksByShowIds.mockResolvedValue([
        {
          type: 'SETUP',
          assigneeId: BigInt(1),
          template: null,
          targets: [{ targetType: 'SHOW', deletedAt: null, showId: BigInt(1) }],
        },
        {
          type: 'CLOSURE',
          assigneeId: BigInt(1),
          template: null,
          targets: [{ targetType: 'SHOW', deletedAt: null, showId: BigInt(1) }],
        },
      ]);

      const [result] = await service.getPlanningReadinessForShowIds(studioUid, ['show_1']);

      expect(result.isReady).toBe(true);
      expect(result.metCount).toBe(5);
    });

    it('keeps task_stages_generated not_met for a premium show missing moderation, independent of tasks_assigned', async () => {
      showService.findMany.mockResolvedValue([
        mockShow({ showStandard: { name: 'premium' } }),
      ]);
      taskService.findTasksByShowIds.mockResolvedValue([
        {
          type: 'SETUP',
          assigneeId: BigInt(1),
          template: null,
          targets: [{ targetType: 'SHOW', deletedAt: null, showId: BigInt(1) }],
        },
        {
          type: 'CLOSURE',
          assigneeId: BigInt(1),
          template: null,
          targets: [{ targetType: 'SHOW', deletedAt: null, showId: BigInt(1) }],
        },
      ]);

      const [result] = await service.getPlanningReadinessForShowIds(studioUid, ['show_1']);

      const byKey = Object.fromEntries(result.conditions.map((c) => [c.key, c.status]));
      expect(byKey.task_stages_generated).toBe('not_met');
      expect(byKey.tasks_assigned).toBe('met');
    });

    it('excludes soft-deleted shows and soft-deleted studios from the lookup', async () => {
      showService.findMany.mockResolvedValue([]);

      await service.getPlanningReadinessForShowIds(studioUid, ['show_1']);

      expect(showService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studio: { uid: studioUid, deletedAt: null },
            deletedAt: null,
          }),
        }),
      );
    });

    it('preserves the requested id order and drops ids that were not found', async () => {
      showService.findMany.mockResolvedValue([mockShow({ id: BigInt(2), uid: 'show_2' })]);

      const result = await service.getPlanningReadinessForShowIds(studioUid, ['show_missing', 'show_2']);

      expect(result.map((r) => r.showUid)).toEqual(['show_2']);
    });
  });

  describe('getPlanningReadinessForShow', () => {
    it('throws not-found when the show does not resolve for the studio', async () => {
      showService.findMany.mockResolvedValue([]);

      await expect(service.getPlanningReadinessForShow(studioUid, 'show_missing')).rejects.toThrow(
        'Show not found with id show_missing',
      );
    });

    it('returns the single checklist result', async () => {
      showService.findMany.mockResolvedValue([mockShow()]);

      const result = await service.getPlanningReadinessForShow(studioUid, 'show_1');

      expect(result.showUid).toBe('show_1');
      expect(result.phase).toBe('planning_readiness');
    });
  });
});
