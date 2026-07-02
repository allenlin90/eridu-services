import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';

import type { UseTableUrlStateReturn } from '@eridu/ui';
import { useTableUrlState } from '@eridu/ui';

import {
  shouldNormalizeShowsSearch,
  type ShowsSearch,
  toCanonicalShowsSearch,
} from '@/features/shows/config/shows-search-schema';

// useSearch's `from` matches the full route id (trailing slash); useNavigate's `from`
// matches the normalized navigable path (no trailing slash) — TanStack Router types these differently.
const SHOWS_SEARCH_ROUTE = '/shows/' as const;
const SHOWS_NAVIGATE_ROUTE = '/shows' as const;

export function useShowsTableState(): UseTableUrlStateReturn {
  const search = useSearch({ from: SHOWS_SEARCH_ROUTE }) as ShowsSearch;
  const navigate = useNavigate({ from: SHOWS_NAVIGATE_ROUTE });
  const needsNormalization = shouldNormalizeShowsSearch(search);
  const tableState = useTableUrlState({
    from: SHOWS_SEARCH_ROUTE,
    searchColumnId: 'name',
    dateColumnId: 'start_time',
  });

  useEffect(() => {
    if (!needsNormalization) {
      return;
    }

    void navigate({
      search: (previous: ShowsSearch) => toCanonicalShowsSearch(previous),
      replace: true,
    });
  }, [navigate, needsNormalization]);

  return tableState;
}
