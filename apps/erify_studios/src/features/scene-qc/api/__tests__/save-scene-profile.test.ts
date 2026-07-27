import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SaveSceneProfileInput } from '@eridu/api-types/scene-qc';

import { saveSceneProfile } from '../save-scene-profile';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { put: vi.fn() },
}));

const BODY: SaveSceneProfileInput = {
  object_key: 'scene_reference/x/y.png',
  file_url: 'https://cdn.example.com/scene_reference/x/y.png',
  mime_type: 'image/png',
  file_size: 100,
  scene_type: 'GRAPHIC_BG',
};

describe('saveSceneProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a put request with the body to the studio-scoped Scene Profile route', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 'scprof_1' } });

    await saveSceneProfile('studio_abc', 'client_xyz', BODY);

    expect(apiClient.put).toHaveBeenCalledWith('/studios/studio_abc/scene-profiles/client_xyz', BODY);
  });
});
