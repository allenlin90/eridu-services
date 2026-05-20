import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getStudioCreatorRoster } from '@/features/studio-creator-roster/api/studio-creator-roster';

const STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;
const SELECTED_RESOLVE_LIMIT = 5;

function formatCreatorLabel(creator: { creator_name: string; creator_alias_name?: string | null }) {
  return creator.creator_alias_name
    ? `${creator.creator_name} (${creator.creator_alias_name})`
    : creator.creator_name;
}

function toUniqueCreatorOptions(creators: Array<{ creator_name: string; creator_alias_name?: string | null }>) {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];

  creators.forEach((creator) => {
    if (seen.has(creator.creator_name)) {
      return;
    }

    seen.add(creator.creator_name);
    options.push({
      value: creator.creator_name,
      label: formatCreatorLabel(creator),
    });
  });

  return options;
}

export function useCreatorMappingCreatorFilter(studioId: string, selectedCreatorName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['creator-mapping-creator-filter', 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      getStudioCreatorRoster(
        studioId,
        { search: search || undefined, limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT },
        { signal },
      ),
    enabled: Boolean(studioId),
    staleTime: STALE_TIME_MS,
  });

  const selectedQuery = useQuery({
    queryKey: ['creator-mapping-creator-filter', 'selected', studioId, selectedCreatorName],
    queryFn: ({ signal }) =>
      getStudioCreatorRoster(
        studioId,
        { search: selectedCreatorName, limit: SELECTED_RESOLVE_LIMIT },
        { signal },
      ),
    enabled: Boolean(studioId && selectedCreatorName),
    staleTime: STALE_TIME_MS,
  });

  const options = useMemo(() => {
    const fetched = toUniqueCreatorOptions(listQuery.data?.data ?? []);
    const selectedRow = selectedQuery.data?.data?.find(
      (creator) => creator.creator_name === selectedCreatorName,
    );

    if (selectedRow && !fetched.some((option) => option.value === selectedRow.creator_name)) {
      return [{
        value: selectedRow.creator_name,
        label: formatCreatorLabel(selectedRow),
      }, ...fetched];
    }

    if (selectedCreatorName && !fetched.some((option) => option.value === selectedCreatorName)) {
      return [{ value: selectedCreatorName, label: selectedCreatorName }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedCreatorName, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}
