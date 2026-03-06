import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getMcs } from '@/features/mcs/api/get-mcs';
import type { Show } from '@/features/shows/api/get-shows';

/**
 * Network hook for MCs field.
 * - Shows 10 placeholder options when no search
 * - Allows searching by name
 * - Always includes currently selected MCs at TOP of list (for visibility in dropdown)
 */
export function useMcsFieldData(show: Show | null) {
  const [search, setSearch] = useState('');

  const { data: mcsData, isLoading } = useQuery({
    queryKey: ['mcs', 'list', { name: search }],
    queryFn: () => getMcs({ name: search, limit: search ? 20 : 10 }),
  });

  const options = useMemo(() => {
    const fetched = mcsData?.data?.map((m) => ({ value: m.id, label: m.alias_name || m.name })) || [];
    const optionsMap = new Map(fetched.map((o) => [o.value, o]));

    // Add selected MCs if not in fetched results
    const selectedIds = new Set<string>();
    show?.mcs?.forEach((mc: any) => {
      const mcId = mc.mc_id || mc.id;
      const mcName = mc.mc_name || mc.name || mc.alias_name;
      if (mcId && mcName) {
        selectedIds.add(mcId);
        if (!optionsMap.has(mcId)) {
          optionsMap.set(mcId, { value: mcId, label: mcName });
        }
      }
    });

    const allOptions = Array.from(optionsMap.values());

    // Put selected MCs at the top so they're visible in dropdown (which only shows first 10)
    if (selectedIds.size > 0) {
      const selected = allOptions.filter((o) => selectedIds.has(o.value));
      const unselected = allOptions.filter((o) => !selectedIds.has(o.value));
      return [...selected, ...unselected];
    }

    return allOptions;
  }, [mcsData, show]);

  return { options, isLoading, setSearch };
}
