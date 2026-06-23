import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelStudioShowWithResolution,
  resolveStudioShowCancellation,
} from '../cancel-studio-show';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('studio show cancellation gate API', () => {
  const mockedPost = vi.mocked(apiClient.post);

  beforeEach(() => {
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({ data: { id: 'show_1' } });
  });

  it('posts the cancellation request to the studio show resolution endpoint', async () => {
    const payload = {
      reason_category: 'CREATOR_UNAVAILABLE',
      reason_note: 'Creator called out',
      resolution_owner_membership_id: 'mship_1',
      follow_up_due_at: null,
      follow_up_notes: 'Check task cleanup',
    } as const;

    const result = await cancelStudioShowWithResolution('studio_1', 'show_1', payload);

    expect(result).toEqual({ id: 'show_1' });
    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/cancel-with-resolution',
      payload,
    );
  });

  it('posts the selected outcome to the studio show resolution endpoint', async () => {
    const payload = {
      outcome: 'COMPLETED',
      resolution_notes: 'Production finished before interruption',
    } as const;

    const result = await resolveStudioShowCancellation('studio_1', 'show_1', payload);

    expect(result).toEqual({ id: 'show_1' });
    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/resolve-cancellation',
      payload,
    );
  });
});
