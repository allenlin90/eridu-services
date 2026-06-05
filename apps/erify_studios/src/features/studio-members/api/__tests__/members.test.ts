import { describe, expect, it, vi } from 'vitest';

import { getStudioMember, getStudioMemberCompensations } from '../members';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('studio member api', () => {
  it('fetches a single member from the member detail route', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { membership_id: 'smb_456' } });

    await getStudioMember('std_123', 'smb_456', { signal: undefined });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/studios/std_123/members/smb_456',
      { signal: undefined },
    );
  });

  it('fetches member compensations from the member-scoped route', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { shifts: [] } });

    await getStudioMemberCompensations('std_123', 'smb_456', {
      date_from: '2026-05-01',
      date_to: '2026-05-31',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/studios/std_123/members/smb_456/compensations',
      {
        params: {
          date_from: '2026-05-01',
          date_to: '2026-05-31',
        },
        signal: undefined,
      },
    );
  });
});
