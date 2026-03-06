import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getPlatforms } from '@/features/platforms/api/get-platforms';
import type { Show } from '@/features/shows/api/get-shows';

const LOOKUP_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Network hook for platforms field.
 * - Shows 10 placeholder options when no search
 * - Allows searching by name
 * - Always includes currently selected platforms at TOP of list (for visibility in dropdown)
 */
export function usePlatformsFieldData(show: Show | null, studioId?: string) {
  const [search, setSearch] = useState('');

  const { data: platformsData, isLoading } = useQuery({
    queryKey: ['platforms', 'list', studioId ?? 'admin', { name: search }],
    queryFn: () => getPlatforms({ name: search, limit: search ? 20 : 10 }, studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = platformsData?.data?.map((p) => ({ value: p.id, label: p.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    // Add selected platforms if not in fetched results
    const selectedIds = new Set<string>();
    show?.platforms?.forEach((platform: any) => {
      const platformId = platform.platform_id || platform.id;
      const platformName = platform.platform_name || platform.name;
      if (platformId && platformName) {
        selectedIds.add(platformId);
        if (!optionsMap.has(platformId)) {
          optionsMap.set(platformId, { value: platformId, label: platformName });
        }
      }
    });

    const allOptions = Array.from(optionsMap.values());

    // Put selected platforms at the top so they're visible in dropdown (which only shows first 10)
    if (selectedIds.size > 0) {
      const selected = allOptions.filter((o) => selectedIds.has(o.value));
      const unselected = allOptions.filter((o) => !selectedIds.has(o.value));
      return [...selected, ...unselected];
    }

    return allOptions;
  }, [platformsData, show]);

  return { options, isLoading, setSearch };
}
