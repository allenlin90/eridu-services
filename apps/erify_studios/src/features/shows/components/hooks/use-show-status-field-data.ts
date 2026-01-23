import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getShowStatuses } from '@/features/show-statuses/api/get-show-statuses';
import type { Show } from '@/features/shows/api/get-shows';

/**
 * Network hook for show status field.
 * Stable list with 1 hour cache.
 */
export function useShowStatusFieldData(show: Show | null) {
  const { data: showStatusesData, isLoading } = useQuery({
    queryKey: ['show-statuses', 'list', 'all'],
    queryFn: () => getShowStatuses({ limit: 100 }),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const options = useMemo(() => {
    const fetched = showStatusesData?.data?.map((s) => ({ value: s.id, label: s.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    if (show?.show_status_id && show?.show_status_name && !optionsMap.has(show.show_status_id)) {
      optionsMap.set(show.show_status_id, { value: show.show_status_id, label: show.show_status_name });
    }
    return Array.from(optionsMap.values());
  }, [showStatusesData, show]);

  return { options, isLoading };
}
