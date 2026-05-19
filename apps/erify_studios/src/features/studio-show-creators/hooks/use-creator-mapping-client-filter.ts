import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getClients } from '@/features/clients/api/get-clients';

const STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;

export function useCreatorMappingClientFilter(studioId: string, selectedClientId?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['creator-mapping-client-filter', 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      getClients(
        { name: search || undefined, limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT },
        studioId,
        { signal },
      ),
    enabled: Boolean(studioId),
    staleTime: STALE_TIME_MS,
  });

  // Resolve the selected client's label so it stays visible on the trigger
  // even when it falls outside the current search page (e.g. the URL state
  // has client_id set but the user hasn't typed a search yet).
  const selectedQuery = useQuery({
    queryKey: ['creator-mapping-client-filter', 'by-id', studioId, selectedClientId],
    queryFn: ({ signal }) =>
      getClients(
        { id: selectedClientId, limit: 1 },
        studioId,
        { signal },
      ),
    enabled: Boolean(studioId && selectedClientId),
    staleTime: STALE_TIME_MS,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((client) => ({
      value: client.id,
      label: client.name,
    }));
    const selected = selectedQuery.data?.data?.[0];

    if (selected && !fetched.some((option) => option.value === selected.id)) {
      return [{ value: selected.id, label: selected.name }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}
