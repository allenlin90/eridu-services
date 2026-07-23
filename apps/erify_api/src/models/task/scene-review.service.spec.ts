import type { SceneReviewQueryTransformed } from '@eridu/api-types/task-management';

import type { TaskSceneReviewCandidate } from './scene-review.mapper';
import { SceneReviewService } from './scene-review.service';
import type { TaskRepository } from './task.repository';

function candidate(uid: string, status: TaskSceneReviewCandidate['status'], image = true): TaskSceneReviewCandidate {
  return {
    uid,
    type: 'SETUP',
    status,
    content: image ? { screenshot: `https://assets.example.com/${uid}.png` } : {},
    metadata: null,
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    snapshot: null,
    targets: [{
      show: {
        uid: `show_${uid.slice(5)}`,
        name: uid,
        startTime: new Date('2026-07-02T02:00:00.000Z'),
        client: null,
        showCreators: [],
        showPlatforms: [],
      },
    }],
  };
}

describe('sceneReviewService', () => {
  const query: SceneReviewQueryTransformed = {
    mode: 'analysis',
    show_start_from: '2026-07-01T23:00:00.000Z',
    show_start_to: '2026-07-02T22:59:59.999Z',
    page: 1,
    limit: 2,
    skip: 0,
    take: 2,
    sort: undefined,
  };
  let repository: jest.Mocked<Pick<TaskRepository, 'findSceneReviewCandidates' | 'findSceneReviewCandidate'>>;
  let service: SceneReviewService;

  beforeEach(() => {
    repository = {
      findSceneReviewCandidates: jest.fn(),
      findSceneReviewCandidate: jest.fn(),
    };
    service = new SceneReviewService(repository as unknown as TaskRepository);
  });

  it('keeps evidence after REVIEW and paginates after removing image-less rows', async () => {
    repository.findSceneReviewCandidates.mockResolvedValue([
      candidate('task_aaa111', 'COMPLETED'),
      candidate('task_bbb222', 'REVIEW', false),
      candidate('task_ccc333', 'IN_PROGRESS'),
      candidate('task_ddd444', 'CLOSED'),
    ] as never);

    const result = await service.list('studio_abc123', query);

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.status)).toEqual(['COMPLETED', 'IN_PROGRESS']);
  });

  it('returns null for missing or image-less detail', async () => {
    repository.findSceneReviewCandidate.mockResolvedValueOnce(null);
    await expect(service.findDetail('studio_abc123', 'task_missing')).resolves.toBeNull();

    repository.findSceneReviewCandidate.mockResolvedValueOnce(candidate('task_aaa111', 'REVIEW', false) as never);
    await expect(service.findDetail('studio_abc123', 'task_aaa111')).resolves.toBeNull();
  });
});
