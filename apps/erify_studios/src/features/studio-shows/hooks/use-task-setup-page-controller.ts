import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { useShiftAlignment } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';
import { toShowScopeDateTimeBounds } from '@/features/studio-shows/utils/show-scope.utils';
import {
  buildScopeRange,
  getDefaultPlanningRange,
  parseSearchDate,
  toApiDate,
} from '@/features/studio-shows/utils/task-setup-scope.utils';

const taskSetupRouteApi = getRouteApi('/studios/$studioId/task-setup');

export function useTaskSetupPageController() {
  const { studioId } = taskSetupRouteApi.useParams();
  const search = taskSetupRouteApi.useSearch();
  const navigate = taskSetupRouteApi.useNavigate();
  const isNeedsAttentionActive = search.needs_attention === true || search.needs_attention === 'true';
  const [isReadinessSnapshotVisible, setIsReadinessSnapshotVisible] = useState(true);
  const [snapshotRefreshSignal, setSnapshotRefreshSignal] = useState(0);
  const [defaultScopeRange] = useState(() => {
    return getDefaultPlanningRange();
  });

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/task-setup',
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
  const triggerSnapshotRefresh = useCallback(() => {
    setSnapshotRefreshSignal((previous) => previous + 1);
  }, []);

  // Shift alignment and scope totals queries (lifted up for shared state)
  const planningDateFrom = toApiDate(search.date_from);
  const planningDateTo = toApiDate(search.date_to);
  const hasIncompletePlanningRange = !planningDateFrom || !planningDateTo;
  const hasInvalidPlanningRange = !hasIncompletePlanningRange && planningDateFrom > planningDateTo;
  const showScopeDateBounds = useMemo(
    () => toShowScopeDateTimeBounds({ dateFrom: planningDateFrom, dateTo: planningDateTo }),
    [planningDateFrom, planningDateTo],
  );
  const alignmentQueryParams = useMemo(() => ({
    ...(showScopeDateBounds.date_from ? { date_from: showScopeDateBounds.date_from } : {}),
    ...(showScopeDateBounds.date_to ? { date_to: showScopeDateBounds.date_to } : {}),
    include_cancelled: false,
    include_past: true,
    match_show_scope: true,
  }), [showScopeDateBounds.date_from, showScopeDateBounds.date_to]);

  const {
    data: shiftAlignmentResponse,
    isLoading: isLoadingShiftAlignment,
    isFetching: isFetchingShiftAlignment,
    refetch: refetchShiftAlignment,
  } = useShiftAlignment(
    studioId,
    alignmentQueryParams,
    {
      enabled: !hasIncompletePlanningRange && !hasInvalidPlanningRange,
    },
  );

  const {
    data: showsScopeResponse,
    isLoading: isLoadingShowsScope,
    isFetching: isFetchingShowsScope,
    refetch: refetchShowsScope,
  } = useQuery({
    queryKey: ['studio-shows', 'scope-total', studioId, showScopeDateBounds.date_from, showScopeDateBounds.date_to, snapshotRefreshSignal],
    queryFn: ({ signal }) =>
      getStudioShows(studioId, {
        page: 1,
        limit: 1,
        date_from: showScopeDateBounds.date_from,
        date_to: showScopeDateBounds.date_to,
      }, { signal }),
    enabled: !hasIncompletePlanningRange && !hasInvalidPlanningRange,
    refetchOnWindowFocus: false,
  });

  const prevRefreshSignal = useRef(snapshotRefreshSignal);
  useEffect(() => {
    if (prevRefreshSignal.current === snapshotRefreshSignal) {
      return;
    }
    prevRefreshSignal.current = snapshotRefreshSignal;
    if (hasIncompletePlanningRange || hasInvalidPlanningRange) {
      return;
    }
    void refetchShiftAlignment();
  }, [snapshotRefreshSignal, refetchShiftAlignment, hasIncompletePlanningRange, hasInvalidPlanningRange]);

  const isLoadingSnapshot = isLoadingShiftAlignment || isLoadingShowsScope;
  const isFetchingSnapshot = isFetchingShiftAlignment || isFetchingShowsScope;
  const showsInScopeCount = showsScopeResponse?.meta.total ?? 0;
  const taskReadinessWarnings = useMemo(
    () => shiftAlignmentResponse?.task_readiness_warnings ?? [],
    [shiftAlignmentResponse],
  );
  const attentionShowUids = useMemo(() => taskReadinessWarnings.map((w) => w.show_id), [taskReadinessWarnings]);

  const refreshSnapshotQueries = useCallback(() => {
    void Promise.all([refetchShiftAlignment(), refetchShowsScope()]);
  }, [refetchShiftAlignment, refetchShowsScope]);

  const activateIssuesFilter = useCallback(() => {
    if (!isNeedsAttentionActive) {
      updateSearch((previous) => ({
        ...previous,
        page: 1,
        needs_attention: true,
      }));
    }
  }, [isNeedsAttentionActive, updateSearch]);

  const toggleNeedsAttention = useCallback(() => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      needs_attention: isNeedsAttentionActive ? undefined : true,
    }));
  }, [isNeedsAttentionActive, updateSearch]);

  const toggleReadinessVisibility = useCallback(() => {
    setIsReadinessSnapshotVisible((previous) => !previous);
  }, []);

  return {
    studioId,
    scopeDateFrom: search.date_from,
    scopeDateTo: search.date_to,
    isNeedsAttentionActive,
    attentionShowUids,
    // Scope date picker
    pickerScopeDateRange,
    setDraftScopeDateRange,
    isScopeDatePickerOpen,
    onScopeDatePickerOpenChange: handleScopeDatePickerOpenChange,
    onResetScope: handleResetScope,
    // Readiness snapshot
    showsInScopeCount,
    taskReadinessWarnings,
    isLoadingSnapshot,
    isFetchingSnapshot,
    isReadinessSnapshotVisible,
    hasIncompletePlanningRange,
    hasInvalidPlanningRange,
    refreshSnapshotQueries,
    activateIssuesFilter,
    toggleReadinessVisibility,
    // Shows table coordination
    triggerSnapshotRefresh,
    toggleNeedsAttention,
  };
}
