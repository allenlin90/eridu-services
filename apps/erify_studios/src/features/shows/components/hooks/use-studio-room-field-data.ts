import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { Show } from '@/features/shows/api/get-shows';
import { getStudioRooms } from '@/features/studio-rooms/api/get-studio-rooms';

const LOOKUP_STALE_TIME_MS = 60 * 60 * 1000;

function getLookupLimit(search: string) {
  if (search) {
    return 20;
  }

  return 10;
}

/**
 * Network hook for studio room field.
 * Stable list with 1 hour cache.
 */
export function useStudioRoomFieldData(show: Show | null) {
  const [search, setSearch] = useState('');

  const { data: studioRoomsData, isLoading } = useQuery({
    queryKey: ['studio-rooms', 'list', 'admin', { name: search }],
    queryFn: ({ signal }) => getStudioRooms({ name: search || undefined, limit: getLookupLimit(search) }, undefined, { signal }),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = studioRoomsData?.data?.map((r) => ({ value: r.id, label: r.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    if (show?.studio_room_id && show?.studio_room_name && !optionsMap.has(show.studio_room_id)) {
      optionsMap.set(show.studio_room_id, { value: show.studio_room_id, label: show.studio_room_name });
    }
    const allOptions = Array.from(optionsMap.values());

    // Put selected room at the top so it's visible in dropdown
    if (show?.studio_room_id) {
      const selectedIndex = allOptions.findIndex((o) => o.value === show.studio_room_id);
      if (selectedIndex > 0) {
        const [selected] = allOptions.splice(selectedIndex, 1);
        allOptions.unshift(selected);
      }
    }

    return allOptions;
  }, [studioRoomsData, show]);

  return { options, isLoading, setSearch };
}
