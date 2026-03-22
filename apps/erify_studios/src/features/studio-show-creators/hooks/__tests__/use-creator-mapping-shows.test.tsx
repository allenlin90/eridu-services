import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreatorMappingShows } from '../use-creator-mapping-shows';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

const mockUseTableUrlState = vi.fn();
vi.mock('@eridu/ui', () => ({
  useTableUrlState: (options: unknown) => mockUseTableUrlState(options),
}));

const mockGetStudioShows = vi.fn();
vi.mock('@/features/studio-shows/api/get-studio-shows', () => ({
  getStudioShows: (...args: unknown[]) => mockGetStudioShows(...args),
  studioShowsKeys: {
    list: (studioId: string, filters: unknown) => ['studio-shows', 'list', studioId, filters],
  },
}));

describe('useCreatorMappingShows', () => {
  const defaultTableState = {
    pagination: { pageIndex: 0, pageSize: 10 },
    onPaginationChange: vi.fn(),
    setPageCount: vi.fn(),
    columnFilters: [],
    onColumnFiltersChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTableUrlState.mockReturnValue(defaultTableState);
    mockUseQuery.mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, totalPages: 0 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockGetStudioShows.mockResolvedValue({
      data: [],
      meta: { total: 0, totalPages: 0 },
    });
  });

  it('forwards creator-centric filters into query key and API params', async () => {
    mockUseTableUrlState.mockReturnValue({
      ...defaultTableState,
      columnFilters: [
        { id: 'name', value: 'night show' },
        { id: 'creator_name', value: 'alice' },
        { id: 'has_creators', value: 'true' },
        { id: 'show_status_name', value: 'LIVE' },
      ],
    });

    renderHook(() => useCreatorMappingShows({ studioId: 'std_1' }));

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };

    expect(queryOptions.queryKey).toEqual([
      'studio-shows',
      'list',
      'std_1',
      expect.objectContaining({
        search: 'night show',
        has_creators: true,
        creator_name: 'alice',
        show_status_name: 'LIVE',
      }),
    ]);

    await queryOptions.queryFn({ signal: undefined } as never);

    expect(mockGetStudioShows).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({
        page: 1,
        limit: 10,
        search: 'night show',
        has_creators: true,
        creator_name: 'alice',
        show_status_name: 'LIVE',
      }),
      { signal: undefined },
    );
  });

  it('maps has_creators=false filter to boolean false', async () => {
    mockUseTableUrlState.mockReturnValue({
      ...defaultTableState,
      columnFilters: [{ id: 'has_creators', value: 'false' }],
    });

    renderHook(() => useCreatorMappingShows({ studioId: 'std_1' }));

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryFn: () => Promise<unknown>;
    };
    await queryOptions.queryFn({ signal: undefined } as never);

    expect(mockGetStudioShows).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({ has_creators: false }),
      { signal: undefined },
    );
  });
});
