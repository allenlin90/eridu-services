import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioShowManagement } from '../use-studio-show-management';

const mockUseTableUrlState = vi.fn();
const mockUseQuery = vi.fn();
const mockGetStudioShows = vi.fn();

vi.mock('@eridu/ui', () => ({
  useTableUrlState: (options: unknown) => mockUseTableUrlState(options),
}));

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock('@/features/studio-shows/api/get-studio-shows', () => ({
  getStudioShows: (...args: unknown[]) => mockGetStudioShows(...args),
  studioShowsKeys: {
    list: (...args: unknown[]) => ['studio-shows', 'list', ...args],
  },
}));

describe('useStudioShowManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTableUrlState.mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [],
      onColumnFiltersChange: vi.fn(),
      sorting: [{ id: 'start_time', desc: true }],
      onSortingChange: vi.fn(),
    });

    mockUseQuery.mockReturnValue({
      data: {
        data: [],
        meta: { totalPages: 1, total: 0 },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    mockGetStudioShows.mockResolvedValue({
      data: [],
      meta: { totalPages: 1, total: 0 },
    });
  });

  it('passes schedule_name through to the studio shows query', async () => {
    mockUseTableUrlState.mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [{ id: 'schedule_name', value: 'Prime Time' }],
      onColumnFiltersChange: vi.fn(),
      sorting: [{ id: 'start_time', desc: true }],
      onSortingChange: vi.fn(),
    });

    renderHook(() => useStudioShowManagement('std_1'));

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(queryOptions.queryKey).toEqual([
      'studio-shows',
      'list',
      'std_1',
      expect.objectContaining({
        schedule_name: 'Prime Time',
      }),
    ]);

    await queryOptions.queryFn({ signal: undefined });

    expect(mockGetStudioShows).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({
        schedule_name: 'Prime Time',
        has_schedule: undefined,
      }),
      { signal: undefined },
    );
  });

  it('treats the orphans keyword as a missing-schedule filter', async () => {
    mockUseTableUrlState.mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [{ id: 'schedule_name', value: 'orphans' }],
      onColumnFiltersChange: vi.fn(),
      sorting: [{ id: 'start_time', desc: true }],
      onSortingChange: vi.fn(),
    });

    renderHook(() => useStudioShowManagement('std_1'));

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(queryOptions.queryKey).toEqual([
      'studio-shows',
      'list',
      'std_1',
      expect.objectContaining({
        has_schedule: 'false',
        schedule_name: undefined,
      }),
    ]);

    await queryOptions.queryFn({ signal: undefined });

    expect(mockGetStudioShows).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({
        has_schedule: false,
        schedule_name: undefined,
      }),
      { signal: undefined },
    );
  });
});
