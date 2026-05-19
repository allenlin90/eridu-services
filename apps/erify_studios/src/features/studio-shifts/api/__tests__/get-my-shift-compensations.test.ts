import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMyShiftCompensations } from '../get-my-shift-compensations';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getMyShiftCompensations', () => {
  beforeEach(() => {
    (apiClient.get as any).mockReset();
  });

  it('calls /me/shift-compensations with the date range + studio filter', async () => {
    const controller = new AbortController();
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        membership_id: 'smb_1',
        user_id: 'user_1',
        user_name: 'Jane',
        user_email: 'jane@example.com',
        date_from: '2026-05-01',
        date_to: '2026-05-31',
        summary: {
          shift_count: 0,
          total_planned_cost: '0.00',
          total_actual_cost: '0.00',
          actual_cost_resolved_shift_count: 0,
          actual_cost_pending_shift_count: 0,
        },
        shifts: [],
      },
    });

    const params = { studio_id: 'std_1', date_from: '2026-05-01', date_to: '2026-05-31' } as const;
    const result = await getMyShiftCompensations(params, { signal: controller.signal });

    expect(apiClient.get).toHaveBeenCalledWith('/me/shift-compensations', {
      params,
      signal: controller.signal,
    });
    expect(result.shifts).toEqual([]);
  });
});
