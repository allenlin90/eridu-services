import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMemberships } from '../use-memberships';

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
vi.mock('@/features/memberships/api/get-memberships', () => ({
  useMembershipsQuery: vi.fn(() => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    },
    isLoading: false,
  })),
}));

vi.mock('@/features/studios/api/get-studios', () => ({
  useStudiosQuery: vi.fn(() => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    },
    isLoading: false,
  })),
}));

vi.mock('@/features/memberships/api/create-membership', () => ({
  useCreateMembership: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/features/memberships/api/update-membership', () => ({
  useUpdateMembership: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/features/memberships/api/delete-membership', () => ({
  useDeleteMembership: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('useMemberships', () => {
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

  it('should return memberships data and mutations', () => {
    const { result } = renderHook(() => useMemberships(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.createMutation).toBeDefined();
    expect(result.current.updateMutation).toBeDefined();
    expect(result.current.deleteMutation).toBeDefined();
  });

  it('should provide pagination controls', () => {
    const { result } = renderHook(() => useMemberships(), {
      wrapper: createWrapper(),
    });

    expect(result.current.onPaginationChange).toBeDefined();
    expect(typeof result.current.onPaginationChange).toBe('function');
  });

  it('should provide filter controls', () => {
    const { result } = renderHook(() => useMemberships(), {
      wrapper: createWrapper(),
    });

    expect(result.current.columnFilters).toBeDefined();
    expect(result.current.onColumnFiltersChange).toBeDefined();
  });

  it('should provide handleRefresh function', () => {
    const { result } = renderHook(() => useMemberships(), {
      wrapper: createWrapper(),
    });

    expect(result.current.handleRefresh).toBeDefined();
    expect(typeof result.current.handleRefresh).toBe('function');
  });
});
