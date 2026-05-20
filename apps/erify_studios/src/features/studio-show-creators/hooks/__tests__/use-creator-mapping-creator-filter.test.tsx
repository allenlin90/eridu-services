import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreatorMappingCreatorFilter } from '../use-creator-mapping-creator-filter';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

const mockGetStudioCreatorRoster = vi.fn();
vi.mock('@/features/studio-creator-roster/api/studio-creator-roster', () => ({
  getStudioCreatorRoster: (...args: unknown[]) => mockGetStudioCreatorRoster(...args),
}));

describe('useCreatorMappingCreatorFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
    });
    mockGetStudioCreatorRoster.mockResolvedValue({ data: [] });
  });

  it('keys the list query by studio + search and calls getStudioCreatorRoster with search params', async () => {
    const { result, rerender } = renderHook(
      ({ studioId, selectedCreatorName }: { studioId: string; selectedCreatorName?: string }) =>
        useCreatorMappingCreatorFilter(studioId, selectedCreatorName),
      { initialProps: { studioId: 'std_1', selectedCreatorName: undefined } },
    );

    const initialListQuery = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
      enabled?: boolean;
    };

    expect(initialListQuery.queryKey).toEqual([
      'creator-mapping-creator-filter',
      'list',
      'std_1',
      { search: '' },
    ]);
    expect(initialListQuery.enabled).toBe(true);

    await initialListQuery.queryFn({ signal: undefined });
    expect(mockGetStudioCreatorRoster).toHaveBeenCalledWith(
      'std_1',
      { search: undefined, limit: 10 },
      { signal: undefined },
    );

    act(() => {
      result.current.setSearch('alice');
    });
    rerender({ studioId: 'std_1', selectedCreatorName: undefined });

    const lastListQuery = mockUseQuery.mock.calls
      .filter((call) => (call[0] as { queryKey: unknown[] }).queryKey[1] === 'list')
      .at(-1)?.[0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(lastListQuery.queryKey).toEqual([
      'creator-mapping-creator-filter',
      'list',
      'std_1',
      { search: 'alice' },
    ]);

    await lastListQuery.queryFn({ signal: undefined });
    expect(mockGetStudioCreatorRoster).toHaveBeenLastCalledWith(
      'std_1',
      { search: 'alice', limit: 20 },
      { signal: undefined },
    );
  });

  it('only enables the selected resolver when a creator is selected', () => {
    renderHook(() => useCreatorMappingCreatorFilter('std_1', undefined));

    const selectedQuery = mockUseQuery.mock.calls
      .find((call) => (call[0] as { queryKey: unknown[] }).queryKey[1] === 'selected')?.[0] as {
      enabled?: boolean;
    };

    expect(selectedQuery?.enabled).toBe(false);

    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
    });

    renderHook(() => useCreatorMappingCreatorFilter('std_1', 'Alice Creator'));

    const selectedQuery2 = mockUseQuery.mock.calls
      .find((call) => (call[0] as { queryKey: unknown[] }).queryKey[1] === 'selected')?.[0] as {
      enabled?: boolean;
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(selectedQuery2?.enabled).toBe(true);
    expect(selectedQuery2?.queryKey).toEqual([
      'creator-mapping-creator-filter',
      'selected',
      'std_1',
      'Alice Creator',
    ]);
  });

  it('pins the selected creator at the top when it is not in the current search page', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[1] === 'list') {
        return {
          data: { data: [{ creator_name: 'List Creator', creator_alias_name: 'List' }] },
          isLoading: false,
          isFetching: false,
        };
      }
      return {
        data: { data: [{ creator_name: 'Selected Creator', creator_alias_name: 'Sel' }] },
        isLoading: false,
        isFetching: false,
      };
    });

    const { result } = renderHook(() =>
      useCreatorMappingCreatorFilter('std_1', 'Selected Creator'),
    );

    expect(result.current.options).toEqual([
      { value: 'Selected Creator', label: 'Selected Creator (Sel)' },
      { value: 'List Creator', label: 'List Creator (List)' },
    ]);
  });

  it('does not duplicate creators with the same filter value', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[1] === 'list') {
        return {
          data: {
            data: [
              { creator_name: 'Selected Creator', creator_alias_name: 'Sel' },
              { creator_name: 'Selected Creator', creator_alias_name: 'Duplicate' },
            ],
          },
          isLoading: false,
          isFetching: false,
        };
      }
      return {
        data: { data: [{ creator_name: 'Selected Creator', creator_alias_name: 'Sel' }] },
        isLoading: false,
        isFetching: false,
      };
    });

    const { result } = renderHook(() =>
      useCreatorMappingCreatorFilter('std_1', 'Selected Creator'),
    );

    expect(result.current.options).toEqual([
      { value: 'Selected Creator', label: 'Selected Creator (Sel)' },
    ]);
  });
});
