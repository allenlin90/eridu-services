import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getShowTypes } from '@/features/show-types/api/get-show-types';
import type { Show } from '@/features/shows/api/get-shows';

const LOOKUP_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Network hook for show type field.
 * Stable list with 1 hour cache.
 */
export function useShowTypeFieldData(show: Show | null, studioId?: string) {
  const [search, setSearch] = useState('');

  const { data: showTypesData, isLoading } = useQuery({
    queryKey: ['show-types', 'list', studioId ?? 'admin', { name: search }],
    queryFn: ({ signal }) => getShowTypes({ name: search || undefined, limit: search ? 20 : 10 }, studioId, { signal }),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = showTypesData?.data?.map((t) => ({ value: t.id, label: t.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    if (show?.show_type_id && show?.show_type_name && !optionsMap.has(show.show_type_id)) {
      optionsMap.set(show.show_type_id, { value: show.show_type_id, label: show.show_type_name });
    }
    return Array.from(optionsMap.values());
  }, [showTypesData, show]);

  return { options, isLoading, setSearch };
}
