import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSceneProfile } from '../get-scene-profile';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('getSceneProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the studio-scoped Scene Profile route with the abort signal', async () => {
    const signal = new AbortController().signal;
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'scprof_1' } });

    await getSceneProfile('studio_abc', 'client_xyz', { signal });

    expect(apiClient.get).toHaveBeenCalledWith('/studios/studio_abc/scene-profiles/client_xyz', { signal });
  });
});
