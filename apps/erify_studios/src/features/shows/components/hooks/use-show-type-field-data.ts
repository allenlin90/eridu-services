import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getShowTypes } from '@/features/show-types/api/get-show-types';
import type { Show } from '@/features/shows/api/get-shows';

/**
 * Network hook for show type field.
 * Stable list with 1 hour cache.
 */
export function useShowTypeFieldData(show: Show | null, studioId?: string) {
  const { data: showTypesData, isLoading } = useQuery({
    queryKey: ['show-types', 'list', studioId ?? 'admin', 'all'],
    queryFn: () => getShowTypes({ limit: 100 }, studioId),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const options = useMemo(() => {
    const fetched = showTypesData?.data?.map((t) => ({ value: t.id, label: t.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    if (show?.show_type_id && show?.show_type_name && !optionsMap.has(show.show_type_id)) {
      optionsMap.set(show.show_type_id, { value: show.show_type_id, label: show.show_type_name });
    }
    return Array.from(optionsMap.values());
  }, [showTypesData, show]);

  return { options, isLoading };
}
