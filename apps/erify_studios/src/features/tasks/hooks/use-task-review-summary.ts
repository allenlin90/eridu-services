import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { getStudioTasksReviewStats, studioTasksKeys } from '@/features/tasks/api/get-studio-tasks';
import { isCurrentOperationalDay, OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS, operationalWindowToDayRange } from '@/lib/operational-day-range';

type UseTaskReviewSummaryProps = {
  studioId: string;
  dateRange: DateRange | undefined;
};

export function useTaskReviewSummary({ studioId, dateRange }: UseTaskReviewSummaryProps) {
  // Compute effective date range for fetching review stats
  const effectiveRange = useMemo(
    () => operationalWindowToDayRange(dateRange),
    [dateRange],
  );

  // Parallel query parameters (fetch base params)
  const summaryParams = useMemo(() => ({
    due_date_from: effectiveRange.windowStart.toISOString(),
    due_date_to: effectiveRange.windowEnd.toISOString(),
  }), [effectiveRange]);

  const isViewingCurrentOperationalDay = useMemo(
    () => isCurrentOperationalDay(effectiveRange),
    [effectiveRange],
  );

  const { data: stats, isFetching } = useQuery({
    queryKey: studioTasksKeys.stats(studioId, summaryParams),
    queryFn: ({ signal }) => getStudioTasksReviewStats(studioId, summaryParams, { signal }),
    enabled: !!studioId,
    refetchInterval: isViewingCurrentOperationalDay
      ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: false,
  });

  const defaultStats = useMemo(() => ({
    total: 0,
    ready: 0,
    attention: 0,
    done: 0,
    preProdAttentionCount: 0,
    preProdReadyCount: 0,
    preProdDoneCount: 0,
    onAirAttentionCount: 0,
    onAirReadyCount: 0,
    onAirDoneCount: 0,
    postProdAttentionCount: 0,
    postProdReadyCount: 0,
    postProdDoneCount: 0,
  }), []);

  return {
    stats: stats || defaultStats,
    isFetching,
    isViewingCurrentOperationalDay,
  };
}
