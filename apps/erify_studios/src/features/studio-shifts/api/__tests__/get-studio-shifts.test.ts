import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAllStudioShiftsForExport,
  SHIFT_EXPORT_MAX_RECORDS,
  ShiftExportTooLargeError,
} from '../get-studio-shifts';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getAllStudioShiftsForExport', () => {
  beforeEach(() => {
    (apiClient.get as any).mockReset();
  });

  it('fetches every page for the selected export filters and forwards the abort signal', async () => {
    const controller = new AbortController();
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

    const shifts = await getAllStudioShiftsForExport(
      'std_123',
      {
        date_from: '2026-04-01',
        date_to: '2026-04-30',
        status: 'SCHEDULED',
        is_duty_manager: true,
        user_id: 'user_1',
      },
      { signal: controller.signal },
    );

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
      signal: controller.signal,
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
      signal: controller.signal,
    });
  });

  it('fetches remaining pages in parallel after the first page reports totalPages', async () => {
    const callOrder: number[] = [];
    (apiClient.get as any).mockImplementation(async (_url: string, options: any) => {
      const page = options.params.page as number;
      callOrder.push(page);
      if (page === 1) {
        return {
          data: {
            data: [{ id: 'ssh_p1' }],
            meta: { page: 1, limit: 100, total: 250, totalPages: 3 },
          },
        };
      }
      return {
        data: {
          data: [{ id: `ssh_p${page}` }],
          meta: { page, limit: 100, total: 250, totalPages: 3 },
        },
      };
    });

    await getAllStudioShiftsForExport('std_p', { date_from: '2026-04-01', date_to: '2026-04-30' });

    expect(callOrder[0]).toBe(1);
    expect(callOrder.slice(1).sort()).toEqual([2, 3]);
    expect(apiClient.get).toHaveBeenCalledTimes(3);
  });

  it('short-circuits when the first page is the only page', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [{ id: 'ssh_only' }],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    });

    const shifts = await getAllStudioShiftsForExport('std_one', { date_from: '2026-04-01', date_to: '2026-04-30' });

    expect(shifts).toEqual([{ id: 'ssh_only' }]);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('throws ShiftExportTooLargeError without fetching remaining pages when total exceeds the cap', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [{ id: 'ssh_first' }],
        meta: {
          page: 1,
          limit: 100,
          total: SHIFT_EXPORT_MAX_RECORDS + 1,
          totalPages: 999,
        },
      },
    });

    await expect(
      getAllStudioShiftsForExport('std_big', { date_from: '2026-04-01', date_to: '2026-05-31' }),
    ).rejects.toBeInstanceOf(ShiftExportTooLargeError);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
