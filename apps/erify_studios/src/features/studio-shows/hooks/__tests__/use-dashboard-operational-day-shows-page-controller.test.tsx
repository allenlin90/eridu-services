import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboardOperationalDayShowsPageController } from '../use-dashboard-operational-day-shows-page-controller';

const mockUseDashboardOperationalDayShows = vi.fn();
const mockOnPaginationChange = vi.fn();
const mockSetPageCount = vi.fn();

vi.mock('@eridu/ui', () => ({
  useTableUrlState: vi.fn(() => ({
    pagination: { pageIndex: 1, pageSize: 25 },
    onPaginationChange: mockOnPaginationChange,
    setPageCount: mockSetPageCount,
  })),
}));

vi.mock('@/features/studio-shows/hooks/use-dashboard-operational-day-shows', () => ({
  useDashboardOperationalDayShows: (...args: unknown[]) => mockUseDashboardOperationalDayShows(...args),
}));

describe('useDashboardOperationalDayShowsPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDashboardOperationalDayShows.mockReturnValue({
      response: undefined,
      shows: [],
      total: 0,
      totalPages: 1,
      isLoading: false,
      isFetching: true,
    });
  });

  it('derives pagination from shared table url state', () => {
    renderHook(() => useDashboardOperationalDayShowsPageController({
      studioId: 'std_1',
      dayStartIso: '2026-04-10T00:00:00.000Z',
      dayEndIso: '2026-04-11T00:00:00.000Z',
    }));

    expect(mockUseDashboardOperationalDayShows).toHaveBeenCalledWith({
      studioId: 'std_1',
      dayStartIso: '2026-04-10T00:00:00.000Z',
      dayEndIso: '2026-04-11T00:00:00.000Z',
      page: 2,
      limit: 25,
    });
  });

  it('syncs page count and returns response pagination when loaded', () => {
    mockUseDashboardOperationalDayShows.mockReturnValue({
      response: {
        data: [],
        meta: {
          page: 2,
          limit: 25,
          total: 30,
          totalPages: 2,
        },
      },
      shows: [],
      total: 30,
      totalPages: 2,
      isLoading: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useDashboardOperationalDayShowsPageController({
      studioId: 'std_1',
      dayStartIso: '2026-04-10T00:00:00.000Z',
      dayEndIso: '2026-04-11T00:00:00.000Z',
    }));

    expect(mockSetPageCount).toHaveBeenCalledWith(2);
    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 25,
      total: 30,
      pageCount: 2,
    });
    expect(result.current.onPaginationChange).toBe(mockOnPaginationChange);
  });
});
