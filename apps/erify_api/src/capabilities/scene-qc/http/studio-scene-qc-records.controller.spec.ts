import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { SceneQcRecordsQueryService } from '../scene-qc-records.query.service';

import { StudioSceneQcRecordsController } from './studio-scene-qc-records.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioSceneQcRecordsController', () => {
  let controller: StudioSceneQcRecordsController;
  let recordsQueryService: jest.Mocked<SceneQcRecordsQueryService>;

  const studioId = 'std_1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioSceneQcRecordsController],
      providers: [
        { provide: SceneQcRecordsQueryService, useValue: { listRecords: jest.fn(), getRecordDetail: jest.fn() } },
      ],
    }).compile();

    controller = module.get(StudioSceneQcRecordsController);
    recordsQueryService = module.get(SceneQcRecordsQueryService);
  });

  it('grants access to DESIGNER, MANAGER, and ADMIN only', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioSceneQcRecordsController);
    expect(roles).toEqual([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN]);
  });

  it('exposes list and detail under studios/:studioId/scene-qc-records', () => {
    const path = Reflect.getMetadata('path', StudioSceneQcRecordsController);
    expect(path).toBe('studios/:studioId/scene-qc-records');
  });

  describe('list', () => {
    it('wraps the service items/total in a paginated response envelope', async () => {
      recordsQueryService.listRecords.mockResolvedValue({ items: [{ review_id: 'scqcr_1' } as never], total: 1 });

      const result = await controller.list(studioId, { page: 1, limit: 20 } as never);

      expect(recordsQueryService.listRecords).toHaveBeenCalledWith(studioId, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    });
  });

  describe('detail', () => {
    it('delegates to getRecordDetail with the studio and review uid', async () => {
      const detail = { review: { id: 'scqcr_1' } } as never;
      recordsQueryService.getRecordDetail.mockResolvedValue(detail);

      const result = await controller.detail(studioId, 'scqcr_1');

      expect(recordsQueryService.getRecordDetail).toHaveBeenCalledWith(studioId, 'scqcr_1');
      expect(result).toBe(detail);
    });

    it('propagates a 404 raised by the service unchanged', async () => {
      const notFound = Object.assign(new Error('not found'), { status: 404 });
      recordsQueryService.getRecordDetail.mockRejectedValue(notFound);

      await expect(controller.detail(studioId, 'scqcr_missing')).rejects.toBe(notFound);
    });
  });
});
