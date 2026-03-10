import { describe, expect, it, vi } from 'vitest';

import { getShows } from '../get-shows';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getShows', () => {
  it('uses creators from API response when present', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        data: [
          {
            id: 'show_1',
            creators: [{ id: 'sc_1', creator_id: 'creator_1', creator_name: 'Creator One' }],
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });

    const result = await getShows({});

    expect(result.data[0]?.creators).toEqual([
      { id: 'sc_1', creator_id: 'creator_1', creator_name: 'Creator One' },
    ]);
  });

  it('maps empty creators when response creators are missing', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        data: [
          {
            id: 'show_2',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });

    const result = await getShows({});

    expect(result.data[0]?.creators).toEqual([]);
  });
});
