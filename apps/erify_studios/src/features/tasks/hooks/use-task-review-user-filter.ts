import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getMemberships } from '@/features/memberships/api/get-memberships';

const STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;

export function useTaskReviewUserFilter(studioId: string, selectedUserName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['task-review-user-filter', 'list', studioId, { search }],
    queryFn: () =>
      getMemberships({
        name: search || undefined,
        limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT,
        studio_id: studioId,
      }),
    enabled: Boolean(studioId),
    staleTime: STALE_TIME_MS,
  });

  const selectedQuery = useQuery({
    queryKey: ['task-review-user-filter', 'by-name', studioId, selectedUserName],
    queryFn: () =>
      getMemberships({
        name: selectedUserName,
        limit: 1,
        studio_id: studioId,
      }),
    enabled: Boolean(studioId && selectedUserName),
    staleTime: STALE_TIME_MS,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((membership) => ({
      value: membership.user.name,
      label: membership.user.name,
    }));
    const selected = selectedQuery.data?.data?.[0];

    if (selected && !fetched.some((option) => option.value === selected.user.name)) {
      return [{ value: selected.user.name, label: selected.user.name }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}
