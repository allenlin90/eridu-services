import { describe, expect, it, vi } from 'vitest';

import { getStudioCreatorOnboardingUsers } from '../get-onboarding-users';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getStudioCreatorOnboardingUsers', () => {
  it('queries the studio onboarding-user endpoint with search params and abort signal', async () => {
    const controller = new AbortController();
    (apiClient.get as any).mockResolvedValue({ data: [] });

    await getStudioCreatorOnboardingUsers(
      'std_123',
      { search: 'alice', limit: 20 },
      { signal: controller.signal },
    );

    expect(apiClient.get).toHaveBeenCalledWith('/studios/std_123/creators/onboarding-users', {
      params: {
        search: 'alice',
        limit: 20,
      },
      signal: controller.signal,
    });
  });
});
