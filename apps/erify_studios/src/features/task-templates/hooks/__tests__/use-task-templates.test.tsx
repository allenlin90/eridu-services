import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTaskTemplates } from '../use-task-templates';

// Mock dependencies
const mockUseInfiniteQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: any) => mockUseInfiniteQuery(options),
}));

const mockUseTableUrlState = vi.fn();
vi.mock('@eridu/ui', () => ({
  useTableUrlState: (options: any) => mockUseTableUrlState(options),
}));

// Mock API
vi.mock('../../api/get-task-templates', () => ({
  getTaskTemplates: vi.fn(),
}));

describe('useTaskTemplates', () => {
  const defaultTableState = {
    columnFilters: [],
    pagination: { pageIndex: 0, pageSize: 20 },
    sorting: [],
    onPaginationChange: vi.fn(),
    onSortingChange: vi.fn(),
    onColumnFiltersChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTableUrlState.mockReturnValue(defaultTableState);
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [{ id: '1', name: 'Template 1' }],
            meta: { total: 10, page: 1, limit: 10, totalPages: 1 },
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it('returns templates and metadata', () => {
    const { result } = renderHook(() => useTaskTemplates({ studioId: 'test-studio' }));

    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].name).toBe('Template 1');
    expect(result.current.total).toBe(10);
  });

  it('exposes isFetching state', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      isFetching: true, // Simulate fetching
      isError: false,
    });

    const { result } = renderHook(() => useTaskTemplates({ studioId: 'test-studio' }));

    expect(result.current.isFetching).toBe(true);
  });

  it('handles search query from URL state', () => {
    mockUseTableUrlState.mockReturnValue({
      ...defaultTableState,
      columnFilters: [{ id: 'name', value: 'search-term' }],
    });

    renderHook(() => useTaskTemplates({ studioId: 'test-studio' }));

    // Verify useInfiniteQuery was called with correct queryKey including search term
    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['task-templates', 'test-studio', 'search-term'],
      }),
    );
  });
});
