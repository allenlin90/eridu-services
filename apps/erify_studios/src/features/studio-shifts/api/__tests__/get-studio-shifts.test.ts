import { describe, expect, it, vi } from 'vitest';

import { getAllStudioShiftsForExport } from '../get-studio-shifts';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getAllStudioShiftsForExport', () => {
  it('fetches every page for the selected export filters', async () => {
    (apiClient.get as any)
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'ssh_1' }],
          meta: { page: 1, limit: 100, total: 103, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'ssh_101' }, { id: 'ssh_102' }, { id: 'ssh_103' }],
          meta: { page: 2, limit: 100, total: 103, totalPages: 2 },
        },
      });

    const shifts = await getAllStudioShiftsForExport('std_123', {
      date_from: '2026-04-01',
      date_to: '2026-04-30',
      status: 'SCHEDULED',
      is_duty_manager: true,
      user_id: 'user_1',
    });

    expect(shifts).toEqual([
      { id: 'ssh_1' },
      { id: 'ssh_101' },
      { id: 'ssh_102' },
      { id: 'ssh_103' },
    ]);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/studios/std_123/shifts', {
      params: {
        date_from: '2026-04-01',
        date_to: '2026-04-30',
        status: 'SCHEDULED',
        is_duty_manager: true,
        user_id: 'user_1',
        page: 1,
        limit: 100,
      },
      signal: undefined,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/studios/std_123/shifts', {
      params: {
        date_from: '2026-04-01',
        date_to: '2026-04-30',
        status: 'SCHEDULED',
        is_duty_manager: true,
        user_id: 'user_1',
        page: 2,
        limit: 100,
      },
      signal: undefined,
    });
  });
});
