import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSceneReview,
  getSceneReviewDetail,
  sceneReviewKeys,
} from '../get-scene-review';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('scene Review API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards list filters and abort signal', async () => {
    const signal = new AbortController().signal;
    const params = {
      mode: 'analysis' as const,
      show_start_from: '2026-07-01T23:00:00.000Z',
      show_start_to: '2026-07-02T22:59:59.999Z',
      page: 1,
      limit: 20,
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [], meta: {} } });

    await getSceneReview('studio_abc123', params, { signal });

    expect(apiClient.get).toHaveBeenCalledWith('/studios/studio_abc123/scene-review', {
      params,
      signal,
    });
    expect(sceneReviewKeys.list('studio_abc123', params)).toContain(params);
  });

  it('loads detail from the dedicated route', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { task_id: 'task_abc123' } });

    await getSceneReviewDetail('studio_abc123', 'task_abc123');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/studios/studio_abc123/scene-review/task_abc123',
      { signal: undefined },
    );
  });
});
