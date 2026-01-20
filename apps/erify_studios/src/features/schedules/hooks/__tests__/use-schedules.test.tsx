import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSchedules } from '../use-schedules';

// Mock useTableUrlState
vi.mock('@eridu/ui', () => ({
  useTableUrlState: vi.fn(() => ({
    pagination: { pageIndex: 0, pageSize: 10 },
    onPaginationChange: vi.fn(),
    setPageCount: vi.fn(),
    columnFilters: [],
    onColumnFiltersChange: vi.fn(),
  })),
}));

// Mock the explicit API hooks
vi.mock('@/features/schedules/api/get-schedules', () => ({
  useSchedulesQuery: vi.fn(() => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
  })),
}));

vi.mock('@/features/schedules/api/update-schedule', () => ({
  useUpdateSchedule: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/features/schedules/api/delete-schedule', () => ({
  useDeleteSchedule: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('useSchedules', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    return Wrapper;
  };

  it('should return schedules data and mutations', () => {
    const { result } = renderHook(() => useSchedules({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.updateMutation).toBeDefined();
    expect(result.current.deleteMutation).toBeDefined();
  });

  it('should provide pagination controls', () => {
    const { result } = renderHook(() => useSchedules({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.onPaginationChange).toBeDefined();
    expect(typeof result.current.onPaginationChange).toBe('function');
  });

  it('should provide filter controls', () => {
    const { result } = renderHook(() => useSchedules({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.columnFilters).toBeDefined();
    expect(result.current.onColumnFiltersChange).toBeDefined();
  });

  it('should provide handleRefresh function', () => {
    const { result } = renderHook(() => useSchedules({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.handleRefresh).toBeDefined();
    expect(typeof result.current.handleRefresh).toBe('function');
  });
});
