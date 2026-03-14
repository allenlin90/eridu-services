import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAllTaskTemplates } from '../use-all-task-templates';

const mockUseInfiniteQuery = vi.fn();
const mockGetQueryState = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: any) => mockUseInfiniteQuery(options),
  useQueryClient: () => ({
    getQueryState: mockGetQueryState,
  }),
}));

vi.mock('../../api/get-task-templates', () => ({
  getTaskTemplates: vi.fn(),
}));

describe('useAllTaskTemplates', () => {
  it('disables mount/focus/reconnect refetch for picker query', () => {
    mockGetQueryState.mockReturnValue(undefined);
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    });

    renderHook(() => useAllTaskTemplates({ studioId: 'std_1', enabled: true }));

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryKey: ['task-templates', 'list', 'std_1', 'all-picker', { search: undefined, pageSize: 100 }],
      }),
    );
  });

  it('refetches once when picker cache was explicitly invalidated', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockGetQueryState.mockReturnValue({ isInvalidated: true });
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch,
    });

    renderHook(() => useAllTaskTemplates({ studioId: 'std_1', enabled: true }));

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});
