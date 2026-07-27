import { beforeEach, describe, expect, it, vi } from 'vitest';

import { retireSceneProfile } from '../retire-scene-profile';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { delete: vi.fn() },
}));

describe('retireSceneProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a delete request with the required version as a query param', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

    await retireSceneProfile('studio_abc', 'client_xyz', 3);

    expect(apiClient.delete).toHaveBeenCalledWith('/studios/studio_abc/scene-profiles/client_xyz', {
      params: { version: 3 },
    });
  });
});
