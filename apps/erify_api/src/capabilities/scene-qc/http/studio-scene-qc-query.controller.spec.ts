import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { SceneQcQueryService } from '../scene-qc-query.service';

import { StudioSceneQcQueryController } from './studio-scene-qc-query.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioSceneQcQueryController', () => {
  let controller: StudioSceneQcQueryController;
  let queryService: jest.Mocked<SceneQcQueryService>;

  const studioId = 'std_1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioSceneQcQueryController],
      providers: [
        {
          provide: SceneQcQueryService,
          useValue: {
            getDailySummary: jest.fn(),
            listDailyItems: jest.fn(),
            getDailyItemDetail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StudioSceneQcQueryController);
    queryService = module.get(SceneQcQueryService);
  });

  it('grants access to DESIGNER, MANAGER, and ADMIN only', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioSceneQcQueryController);
    expect(roles).toEqual([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN]);
  });

  it('exposes exactly summary/items/items/:showId under studios/:studioId/scene-qc', () => {
    const path = Reflect.getMetadata('path', StudioSceneQcQueryController);
    expect(path).toBe('studios/:studioId/scene-qc');
    for (const method of ['summary', 'items', 'itemDetail'] as const) {
      expect(typeof controller[method]).toBe('function');
    }
  });

  describe('summary', () => {
    it('delegates to getDailySummary with the studio uid and operational_date', async () => {
      const summary = { eligible_count: 3 } as any;
      queryService.getDailySummary.mockResolvedValue(summary);

      const result = await controller.summary(studioId, { operationalDate: '2026-06-01' } as any);

      expect(queryService.getDailySummary).toHaveBeenCalledWith(studioId, '2026-06-01');
      expect(result).toBe(summary);
    });
  });

  describe('items', () => {
    it('wraps the service items/total in a paginated response envelope', async () => {
      queryService.listDailyItems.mockResolvedValue({ items: [{ show_id: 'show_1' } as any], total: 1 });

      const result = await controller.items(studioId, {
        operationalDate: '2026-06-01',
        page: 1,
        limit: 20,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    });
  });

  describe('itemDetail', () => {
    it('delegates to getDailyItemDetail with studio uid, show uid, and operational_date', async () => {
      const detail = { show: { id: 'show_1' } } as any;
      queryService.getDailyItemDetail.mockResolvedValue(detail);

      const result = await controller.itemDetail(studioId, 'show_1', { operationalDate: '2026-06-01' } as any);

      expect(queryService.getDailyItemDetail).toHaveBeenCalledWith(studioId, 'show_1', '2026-06-01');
      expect(result).toBe(detail);
    });

    it('propagates a 404 raised by the service unchanged', async () => {
      const notFound = Object.assign(new Error('not found'), { status: 404 });
      queryService.getDailyItemDetail.mockRejectedValue(notFound);

      await expect(
        controller.itemDetail(studioId, 'show_missing', { operationalDate: '2026-06-01' } as any),
      ).rejects.toBe(notFound);
    });
  });
});
