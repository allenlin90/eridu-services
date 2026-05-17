import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAllStudioShowsForExport,
  SHOW_EXPORT_MAX_RECORDS,
  ShowExportTooLargeError,
} from '../get-studio-shows';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getAllStudioShowsForExport', () => {
  const mockedApiGet = vi.mocked(apiClient.get);

  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('fetches every page for the selected export filters and forwards the abort signal', async () => {
    const controller = new AbortController();
    mockedApiGet
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'show_1' }],
          meta: { page: 1, limit: 100, total: 102, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'show_101' }, { id: 'show_102' }],
          meta: { page: 2, limit: 100, total: 102, totalPages: 2 },
        },
      });

    const shows = await getAllStudioShowsForExport(
      'std_123',
      {
        date_from: '2026-04-01T00:00:00.000Z',
        date_to: '2026-04-30T23:59:59.999Z',
        planning_date_from: '2026-04-01',
        planning_date_to: '2026-04-30',
        search: 'Launch',
        actuals_state: 'missing',
        needs_attention: true,
      },
      { signal: controller.signal },
    );

    expect(shows).toEqual([
      { id: 'show_1' },
      { id: 'show_101' },
      { id: 'show_102' },
    ]);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/studios/std_123/shows', {
      params: {
        date_from: '2026-04-01T00:00:00.000Z',
        date_to: '2026-04-30T23:59:59.999Z',
        planning_date_from: '2026-04-01',
        planning_date_to: '2026-04-30',
        search: 'Launch',
        actuals_state: 'missing',
        needs_attention: true,
        page: 1,
        limit: 100,
      },
      signal: controller.signal,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/studios/std_123/shows', {
      params: {
        date_from: '2026-04-01T00:00:00.000Z',
        date_to: '2026-04-30T23:59:59.999Z',
        planning_date_from: '2026-04-01',
        planning_date_to: '2026-04-30',
        search: 'Launch',
        actuals_state: 'missing',
        needs_attention: true,
        page: 2,
        limit: 100,
      },
      signal: controller.signal,
    });
  });

  it('throws ShowExportTooLargeError without fetching remaining pages when total exceeds the cap', async () => {
    mockedApiGet.mockResolvedValueOnce({
      data: {
        data: [{ id: 'show_first' }],
        meta: {
          page: 1,
          limit: 100,
          total: SHOW_EXPORT_MAX_RECORDS + 1,
          totalPages: 999,
        },
      },
    });

    await expect(
      getAllStudioShowsForExport('std_big', { date_from: '2026-04-01T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(ShowExportTooLargeError);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
