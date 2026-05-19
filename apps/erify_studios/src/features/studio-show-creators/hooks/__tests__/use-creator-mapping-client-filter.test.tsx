import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreatorMappingClientFilter } from '../use-creator-mapping-client-filter';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

const mockGetClients = vi.fn();
vi.mock('@/features/clients/api/get-clients', () => ({
  getClients: (...args: unknown[]) => mockGetClients(...args),
}));

describe('useCreatorMappingClientFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
    });
    mockGetClients.mockResolvedValue({ data: [] });
  });

  it('keys the list query by studio + search and calls getClients with the search params', async () => {
    const { result, rerender } = renderHook(
      ({ studioId, selectedClientId }: { studioId: string; selectedClientId?: string }) =>
        useCreatorMappingClientFilter(studioId, selectedClientId),
      { initialProps: { studioId: 'std_1', selectedClientId: undefined } },
    );

    const initialListQuery = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
      enabled?: boolean;
    };

    expect(initialListQuery.queryKey).toEqual([
      'creator-mapping-client-filter',
      'list',
      'std_1',
      { search: '' },
    ]);
    expect(initialListQuery.enabled).toBe(true);

    await initialListQuery.queryFn({ signal: undefined });
    expect(mockGetClients).toHaveBeenCalledWith(
      { name: undefined, limit: 10 },
      'std_1',
      { signal: undefined },
    );

    act(() => {
      result.current.setSearch('acme');
    });
    rerender({ studioId: 'std_1', selectedClientId: undefined });

    const lastListQuery = mockUseQuery.mock.calls
      .filter((call) => (call[0] as { queryKey: unknown[] }).queryKey[1] === 'list')
      .at(-1)?.[0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(lastListQuery.queryKey).toEqual([
      'creator-mapping-client-filter',
      'list',
      'std_1',
      { search: 'acme' },
    ]);

    await lastListQuery.queryFn({ signal: undefined });
    expect(mockGetClients).toHaveBeenLastCalledWith(
      { name: 'acme', limit: 20 },
      'std_1',
      { signal: undefined },
    );
  });

  it('only enables the by-id resolver when a client is selected', () => {
    renderHook(() => useCreatorMappingClientFilter('std_1', undefined));

    const byIdQuery = mockUseQuery.mock.calls
      .find((call) => (call[0] as { queryKey: unknown[] }).queryKey[1] === 'by-id')?.[0] as {
      enabled?: boolean;
    };

    expect(byIdQuery?.enabled).toBe(false);

    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
    });

    renderHook(() => useCreatorMappingClientFilter('std_1', 'cli_ABC123'));

    const byIdQuery2 = mockUseQuery.mock.calls
      .find((call) => (call[0] as { queryKey: unknown[] }).queryKey[1] === 'by-id')?.[0] as {
      enabled?: boolean;
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(byIdQuery2?.enabled).toBe(true);
    expect(byIdQuery2?.queryKey).toEqual([
      'creator-mapping-client-filter',
      'by-id',
      'std_1',
      'cli_ABC123',
    ]);
  });

  it('pins the selected client at the top when it is not in the current search page', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[1] === 'list') {
        return {
          data: { data: [{ id: 'cli_LIST', name: 'List Client' }] },
          isLoading: false,
          isFetching: false,
        };
      }
      return {
        data: { data: [{ id: 'cli_SEL', name: 'Selected Client' }] },
        isLoading: false,
        isFetching: false,
      };
    });

    const { result } = renderHook(() =>
      useCreatorMappingClientFilter('std_1', 'cli_SEL'),
    );

    expect(result.current.options).toEqual([
      { value: 'cli_SEL', label: 'Selected Client' },
      { value: 'cli_LIST', label: 'List Client' },
    ]);
  });

  it('does not duplicate the selected client when it already appears in the search page', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[1] === 'list') {
        return {
          data: { data: [{ id: 'cli_SEL', name: 'Selected Client' }] },
          isLoading: false,
          isFetching: false,
        };
      }
      return {
        data: { data: [{ id: 'cli_SEL', name: 'Selected Client' }] },
        isLoading: false,
        isFetching: false,
      };
    });

    const { result } = renderHook(() =>
      useCreatorMappingClientFilter('std_1', 'cli_SEL'),
    );

    expect(result.current.options).toEqual([
      { value: 'cli_SEL', label: 'Selected Client' },
    ]);
  });
});
