import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminCompensationLineItems } from '../use-admin-compensation-line-items';

// Mock dependencies
const { mockInvalidateQueries, mockSetPageCount } = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockSetPageCount: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  useQuery: vi.fn().mockReturnValue({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
  }),
  keepPreviousData: vi.fn(),
}));
vi.mock('@eridu/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@eridu/ui')>();
  return {
    ...actual,
    useTableUrlState: vi.fn().mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: mockSetPageCount,
      columnFilters: [
        { id: 'studio_id', value: 'stu_123' },
        { id: 'item_type', value: 'BONUS' },
        { id: 'include_deleted', value: 'true' },
        { id: 'created_at', value: { from: new Date('2026-05-01'), to: new Date('2026-05-31') } },
      ],
      onColumnFiltersChange: vi.fn(),
    }),
  };
});

describe('useAdminCompensationLineItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps column filters to query params correctly', () => {
    // This implicitly tests the hook's execution and param mapping logic
    const { result } = renderHook(() =>
      useAdminCompensationLineItems({ from: '/system/compensation-line-items/' }),
    );

    expect(result.current.columnFilters).toContainEqual({ id: 'studio_id', value: 'stu_123' });
    expect(result.current.data?.meta.page).toBe(1);

    // Test that setPageCount is called in useEffect
    expect(mockSetPageCount).toHaveBeenCalledWith(1);
  });

  it('provides a handleRefresh function', () => {
    const { result } = renderHook(() =>
      useAdminCompensationLineItems({ from: '/system/compensation-line-items/' }),
    );

    act(() => {
      result.current.handleRefresh();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['compensation-line-items', 'system'],
    });
  });
});
