import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getClients } from '@/features/clients/api/get-clients';
import type { Show } from '@/features/shows/api/get-shows';

/**
 * Network hook for client field.
 * - Shows 10 placeholder options when no search
 * - Allows searching by name
 * - Always includes currently selected client at TOP of list (for visibility in dropdown)
 */
export function useClientFieldData(show: Show | null) {
  const [search, setSearch] = useState('');

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clients', 'list', { name: search }],
    queryFn: () => getClients({ name: search, limit: search ? 20 : 10 }),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const options = useMemo(() => {
    const fetched = clientsData?.data?.map((c) => ({ value: c.id, label: c.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    // Add selected client if not in fetched results
    if (show?.client_id && show?.client_name && !optionsMap.has(show.client_id)) {
      optionsMap.set(show.client_id, { value: show.client_id, label: show.client_name });
    }

    const allOptions = Array.from(optionsMap.values());

    // Put selected client at the top so it's visible in dropdown (which only shows first 10)
    if (show?.client_id) {
      const selectedIndex = allOptions.findIndex((o) => o.value === show.client_id);
      if (selectedIndex > 0) {
        const [selected] = allOptions.splice(selectedIndex, 1);
        allOptions.unshift(selected);
      }
    }

    return allOptions;
  }, [clientsData, show]);

  return { options, isLoading, setSearch };
}
