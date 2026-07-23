import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioSceneReviewController } from './studio-scene-review.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import type { SceneReviewService } from '@/models/task/scene-review.service';

describe('studioSceneReviewController', () => {
  const service = {
    list: jest.fn(),
    findDetail: jest.fn(),
  } as unknown as jest.Mocked<SceneReviewService>;
  const controller = new StudioSceneReviewController(service);

  beforeEach(() => jest.clearAllMocks());

  it.each(['list', 'detail'] as const)('grants Designers, Managers, and Admins access to %s', (method) => {
    expect(Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioSceneReviewController.prototype[method],
    )).toEqual([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.DESIGNER]);
  });

  it('delegates list criteria and returns paginated metadata', async () => {
    service.list.mockResolvedValue({ items: [], total: 0 });
    const query = {
      mode: 'analysis',
      show_start_from: '2026-07-01T23:00:00.000Z',
      show_start_to: '2026-07-02T22:59:59.999Z',
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
      sort: undefined,
    } as const;

    const result = await controller.list('studio_abc123', query);

    expect(service.list).toHaveBeenCalledWith('studio_abc123', query);
    expect(result).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('returns scoped detail and raises not found for missing evidence', async () => {
    const detail = { task_id: 'task_abc123' } as never;
    service.findDetail.mockResolvedValueOnce(detail);
    await expect(controller.detail('studio_abc123', 'task_abc123')).resolves.toBe(detail);

    service.findDetail.mockResolvedValueOnce(null);
    await expect(controller.detail('studio_abc123', 'task_missing')).rejects.toThrow();
  });
});
