import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getCreators } from '@/features/creators/api/get-creators';
import type { Show } from '@/features/shows/api/get-shows';
import { getCreatorCollection, getCreatorId, getCreatorName } from '@/lib/creator-utils';

/**
 * Network hook for creators field.
 * - Shows 10 placeholder options when no search
 * - Allows searching by name
 * - Always includes currently selected creators at TOP of list (for visibility in dropdown)
 */
export function useCreatorsFieldData(show: Show | null) {
  const [search, setSearch] = useState('');

  const { data: creatorsData, isLoading } = useQuery({
    queryKey: ['creators', 'list', { name: search }],
    queryFn: () => getCreators({ name: search, limit: search ? 20 : 10 }),
  });

  const options = useMemo(() => {
    const fetched = creatorsData?.data?.map((creator) => ({ value: creator.id, label: creator.alias_name || creator.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    // Add selected creators if not in fetched results
    const selectedIds = new Set<string>();
    getCreatorCollection(show).forEach((creator) => {
      const creatorId = getCreatorId(creator);
      const creatorName = getCreatorName(creator);
      if (!creatorId || !creatorName)
        return;

      selectedIds.add(creatorId);
      if (!optionsMap.has(creatorId)) {
        optionsMap.set(creatorId, { value: creatorId, label: creatorName });
      }
    });

    const allOptions = Array.from(optionsMap.values());

    // Put selected creators at the top so they're visible in dropdown (which only shows first 10)
    if (selectedIds.size > 0) {
      const selected = allOptions.filter((o) => selectedIds.has(o.value));
      const unselected = allOptions.filter((o) => !selectedIds.has(o.value));
      return [...selected, ...unselected];
    }

    return allOptions;
  }, [creatorsData, show]);

  return { options, isLoading, setSearch };
}
