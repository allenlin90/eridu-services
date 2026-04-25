import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getShowStandards } from '@/features/show-standards/api/get-show-standards';
import type { Show } from '@/features/shows/api/get-shows';

const LOOKUP_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Network hook for show standard field.
 * Stable list with 1 hour cache.
 */
export function useShowStandardFieldData(show: Show | null, studioId?: string) {
  const [search, setSearch] = useState('');

  const { data: showStandardsData, isLoading } = useQuery({
    queryKey: ['show-standards', 'list', studioId ?? 'admin', { name: search }],
    queryFn: ({ signal }) => getShowStandards({ name: search || undefined, limit: search ? 20 : 10 }, studioId, { signal }),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = showStandardsData?.data?.map((s) => ({ value: s.id, label: s.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    if (show?.show_standard_id && show?.show_standard_name && !optionsMap.has(show.show_standard_id)) {
      optionsMap.set(show.show_standard_id, { value: show.show_standard_id, label: show.show_standard_name });
    }
    return Array.from(optionsMap.values());
  }, [showStandardsData, show]);

  return { options, isLoading, setSearch };
}
