import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getClients } from '@/features/clients/api/get-clients';

const STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;

export function useTaskReviewClientFilter(studioId: string, selectedClientName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['task-review-client-filter', 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      getClients(
        { name: search || undefined, limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT },
        studioId,
        { signal },
      ),
    enabled: Boolean(studioId),
    staleTime: STALE_TIME_MS,
  });

  const selectedQuery = useQuery({
    queryKey: ['task-review-client-filter', 'by-name', studioId, selectedClientName],
    queryFn: ({ signal }) =>
      getClients(
        { name: selectedClientName, limit: 1 },
        studioId,
        { signal },
      ),
    enabled: Boolean(studioId && selectedClientName),
    staleTime: STALE_TIME_MS,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((client) => ({
      value: client.name,
      label: client.name,
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
