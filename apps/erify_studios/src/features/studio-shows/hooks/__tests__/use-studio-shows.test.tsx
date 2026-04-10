import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioShows } from '../use-studio-shows';

const mockUseTableUrlState = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@eridu/ui', () => ({
  useTableUrlState: (options: unknown) => mockUseTableUrlState(options),
}));

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock('@/features/studio-shows/api/get-studio-shows', () => ({
  getStudioShows: vi.fn(),
  studioShowsKeys: {
    list: (...args: unknown[]) => ['studio-shows', 'list', ...args],
  },
}));

describe('useStudioShows', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTableUrlState.mockReturnValue({
      pagination: { pageIndex: 1, pageSize: 25 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [],
      onColumnFiltersChange: vi.fn(),
      sorting: [{ id: 'start_time', desc: true }],
      onSortingChange: vi.fn(),
    });
  });

  it('configures keepPreviousData and uses API pagination metadata when present', () => {
    mockUseQuery.mockReturnValue({
      data: {
        data: [],
        meta: { page: 2, limit: 25, total: 53, totalPages: 3 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useStudioShows({
      studioId: 'std_1',
      dateFrom: '2026-04-10',
      dateTo: '2026-04-10',
      needsAttention: true,
    }));

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      placeholderData: unknown;
    };

    expect(queryOptions.queryKey).toEqual([
      'studio-shows',
      'list',
      'std_1',
      expect.objectContaining({
        page: 2,
        limit: 25,
        needs_attention: true,
      }),
    ]);
    expect(queryOptions.placeholderData).toBeDefined();
    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 25,
      total: 53,
      pageCount: 3,
    });
  });

  it('falls back to url pagination state before metadata exists', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useStudioShows({
      studioId: 'std_1',
      dateFrom: '2026-04-10',
      dateTo: '2026-04-10',
    }));

    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 25,
      total: 0,
      pageCount: 0,
    });
  });
});
