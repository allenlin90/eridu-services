import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  buildScopeRange,
  getDefaultPlanningRange,
  parseSearchDate,
} from '@/features/studio-shows/utils/planning-scope.utils';

const creatorMappingRouteApi = getRouteApi('/studios/$studioId/creator-mapping');

/**
 * View-model for the Creator Mapping route. Owns only the planning-scope window
 * — the date range (persisted in URL search) that the shows section filters by.
 *
 * Defaults to the next 7 days; a draft range is held while the picker is open
 * and committed to the URL on close. The shows query, selection, filters, and
 * export live in {@link CreatorMappingShowsSection}, which receives the
 * committed scope as props.
 *
 * Scope state mirrors the Task Setup route's controller (same planning-scope
 * helpers); the orchestration is duplicated rather than abstracted because the
 * two routes have different typed search schemas and per-route `navigate`.
 */
export function useCreatorMappingPageController() {
  const { studioId } = creatorMappingRouteApi.useParams();
  const search = creatorMappingRouteApi.useSearch();
  const navigate = creatorMappingRouteApi.useNavigate();
  const [defaultScopeRange] = useState(() => getDefaultPlanningRange());

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/creator-mapping',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? true,
    });
  }, [navigate, studioId]);

  useEffect(() => {
    if (search.date_from && search.date_to) {
      return;
    }

    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: previous.date_from ?? defaultScopeRange.date_from,
      date_to: previous.date_to ?? defaultScopeRange.date_to,
    }), { replace: true });
  }, [defaultScopeRange.date_from, defaultScopeRange.date_to, search.date_from, search.date_to, updateSearch]);

  const scopeDateRange = useMemo<DateRange | undefined>(() => {
    if (!search.date_from && !search.date_to) {
      return undefined;
    }

    return {
      from: parseSearchDate(search.date_from),
      to: parseSearchDate(search.date_to),
    };
  }, [search.date_from, search.date_to]);
  const [isScopeDatePickerOpen, setIsScopeDatePickerOpen] = useState(false);
  const [draftScopeDateRange, setDraftScopeDateRange] = useState<DateRange | undefined>(scopeDateRange);
  const pickerScopeDateRange = isScopeDatePickerOpen ? draftScopeDateRange : scopeDateRange;

  const handleScopeDatePickerOpenChange = useCallback((open: boolean) => {
    if (open) {
      setDraftScopeDateRange(scopeDateRange);
      setIsScopeDatePickerOpen(true);
      return;
    }

    setIsScopeDatePickerOpen(false);
    const nextScope = buildScopeRange(draftScopeDateRange);
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: nextScope.date_from,
      date_to: nextScope.date_to,
    }));
  }, [draftScopeDateRange, scopeDateRange, updateSearch]);

  const handleResetScope = useCallback(() => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: defaultScopeRange.date_from,
      date_to: defaultScopeRange.date_to,
    }));
  }, [defaultScopeRange.date_from, defaultScopeRange.date_to, updateSearch]);

  return {
    studioId,
    scopeDateFrom: search.date_from,
    scopeDateTo: search.date_to,
    pickerScopeDateRange,
    setDraftScopeDateRange,
    isScopeDatePickerOpen,
    onScopeDatePickerOpenChange: handleScopeDatePickerOpenChange,
    onResetScope: handleResetScope,
  };
}
