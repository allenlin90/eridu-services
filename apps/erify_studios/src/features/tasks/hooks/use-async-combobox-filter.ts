import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;

export type ComboboxOption = { value: string; label: string };

type UseAsyncComboboxFilterParams<TItem> = {
  /** Stable prefix used to namespace both react-query keys. */
  queryKeyBase: string;
  studioId: string;
  /** Currently selected value, used to keep its label resolved on the trigger. */
  selectedValue?: string;
  /** Fetches the paged list of items for the current search term. */
  fetchList: (args: { search: string; limit: number; signal?: AbortSignal }) => Promise<TItem[]>;
  /** Resolves the single item backing the active selection (for label persistence). */
  fetchSelected: (args: { value: string; signal?: AbortSignal }) => Promise<TItem | undefined>;
  /** Maps an item to its combobox option. Must be a stable reference. */
  toOption: (item: TItem) => ComboboxOption;
};

/**
 * Shared async combobox filter: server-queries a collection as the user types and
 * keeps the active selection's label visible even when it falls outside the first
 * page of results. See `.agent/skills/table-view-pattern` (Async Combobox Filters).
 */
export function useAsyncComboboxFilter<TItem>({
  queryKeyBase,
  studioId,
  selectedValue,
  fetchList,
  fetchSelected,
  toOption,
}: UseAsyncComboboxFilterParams<TItem>) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: [queryKeyBase, 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      fetchList({ search, limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT, signal }),
    enabled: Boolean(studioId),
    staleTime: STALE_TIME_MS,
  });

  const selectedQuery = useQuery({
    queryKey: [queryKeyBase, 'selected', studioId, selectedValue],
    queryFn: ({ signal }) => fetchSelected({ value: selectedValue as string, signal }),
    enabled: Boolean(studioId && selectedValue),
    staleTime: STALE_TIME_MS,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data ?? []).map(toOption);
    const selected = selectedQuery.data ? toOption(selectedQuery.data) : undefined;

    if (selected && !fetched.some((option) => option.value === selected.value)) {
      return [selected, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data, toOption]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}
