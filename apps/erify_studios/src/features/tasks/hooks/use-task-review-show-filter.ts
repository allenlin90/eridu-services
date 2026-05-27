import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';

const STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;

export function useTaskReviewShowFilter(studioId: string, selectedShowName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['task-review-show-filter', 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      getStudioShows(
        studioId,
        { search: search || undefined, limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT },
        { signal },
      ),
    enabled: Boolean(studioId),
    staleTime: STALE_TIME_MS,
  });

  const selectedQuery = useQuery({
    queryKey: ['task-review-show-filter', 'by-name', studioId, selectedShowName],
    queryFn: ({ signal }) =>
      getStudioShows(
        studioId,
        { search: selectedShowName, limit: 1 },
        { signal },
      ),
    enabled: Boolean(studioId && selectedShowName),
    staleTime: STALE_TIME_MS,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((show) => ({
      value: show.name,
      label: show.name,
    }));
    const selected = selectedQuery.data?.data?.[0];

    if (selected && !fetched.some((option) => option.value === selected.name)) {
      return [{ value: selected.name, label: selected.name }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}
