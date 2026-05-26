import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { getStudioTasks, studioTasksKeys } from '@/features/tasks/api/get-studio-tasks';
import { getTaskIssues, getTaskPhase } from '@/features/tasks/config/studio-task-columns';
import { isCurrentOperationalDay, OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS, operationalWindowToDayRange } from '@/lib/operational-day-range';

type UseTaskReviewSummaryProps = {
  studioId: string;
  dateRange: DateRange | undefined;
};

export function useTaskReviewSummary({ studioId, dateRange }: UseTaskReviewSummaryProps) {
  // Compute effective date range for fetching ALL Review-status tasks in parallel
  const effectiveRange = useMemo(
    () => operationalWindowToDayRange(dateRange),
    [dateRange],
  );

  // Parallel query parameters (fetch base params)
  const summaryParams = useMemo(() => ({
    due_date_from: effectiveRange.windowStart.toISOString(),
    due_date_to: effectiveRange.windowEnd.toISOString(),
    status: 'REVIEW' as const,
    limit: 100,
  }), [effectiveRange]);

  const isViewingCurrentOperationalDay = useMemo(
    () => isCurrentOperationalDay(effectiveRange),
    [effectiveRange],
  );

  const { data: summaryData, isFetching } = useQuery({
    queryKey: studioTasksKeys.list(studioId, summaryParams),
    queryFn: async ({ signal }) => {
      // 1. Fetch dated tasks in parallel batches
      const fetchDated = async () => {
        const firstPage = await getStudioTasks(studioId, { ...summaryParams, page: 1 }, { signal });
        const totalPages = firstPage.meta?.totalPages || 1;

        if (totalPages <= 1) {
          return firstPage.data;
        }

        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(
            getStudioTasks(studioId, { ...summaryParams, page: p }, { signal }),
          );
        }

        const otherPages = await Promise.all(pagePromises);
        return [
          ...firstPage.data,
          ...otherPages.flatMap((page) => page.data),
        ];
      };

      // 2. Fetch undated tasks in parallel batches to capture tasks with due_date = null
      const fetchUndated = async () => {
        const undatedParams = {
          status: 'REVIEW' as const,
          has_due_date: false,
          limit: 100,
        };
        const firstPage = await getStudioTasks(studioId, { ...undatedParams, page: 1 }, { signal });
        const totalPages = firstPage.meta?.totalPages || 1;

        if (totalPages <= 1) {
          return firstPage.data;
        }

        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(
            getStudioTasks(studioId, { ...undatedParams, page: p }, { signal }),
          );
        }

        const otherPages = await Promise.all(pagePromises);
        return [
          ...firstPage.data,
          ...otherPages.flatMap((page) => page.data),
        ];
      };

      // Concurrently query both subsets and merge results
      const [datedData, undatedData] = await Promise.all([
        fetchDated(),
        fetchUndated(),
      ]);

      const allData = [...datedData, ...undatedData];

      return {
        data: allData,
        meta: {
          total: allData.length,
          limit: allData.length,
          totalPages: 1,
          page: 1,
        },
      };
    },
    enabled: !!studioId,
    refetchInterval: isViewingCurrentOperationalDay
      ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: false,
  });

  // Group and compute statistics dynamically
  const stats = useMemo(() => {
    const allReviewTasks = summaryData?.data || [];
    let ready = 0;
    let attention = 0;
    const preProdAttention: string[] = [];
    const preProdReady: string[] = [];
    const onAirAttention: string[] = [];
    const onAirReady: string[] = [];
    const postProdAttention: string[] = [];
    const postProdReady: string[] = [];

    allReviewTasks.forEach((task) => {
      const issues = getTaskIssues(task);
      const hasIssues = issues.length > 0;
      const phase = getTaskPhase(task.type);

      if (hasIssues) {
        attention++;
        if (phase === 'pre-production')
          preProdAttention.push(task.id);
        else if (phase === 'post-production')
          postProdAttention.push(task.id);
        else onAirAttention.push(task.id);
      } else {
        ready++;
        if (phase === 'pre-production')
          preProdReady.push(task.id);
        else if (phase === 'post-production')
          postProdReady.push(task.id);
        else onAirReady.push(task.id);
      }
    });

    return {
      total: allReviewTasks.length,
      ready,
      attention,
      preProdAttentionCount: preProdAttention.length,
      preProdReadyCount: preProdReady.length,
      onAirAttentionCount: onAirAttention.length,
      onAirReadyCount: onAirReady.length,
      postProdAttentionCount: postProdAttention.length,
      postProdReadyCount: postProdReady.length,
    };
  }, [summaryData]);

  return {
    summaryData,
    stats,
    isFetching,
    isViewingCurrentOperationalDay,
  };
}
