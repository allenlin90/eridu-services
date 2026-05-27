import { useQuery } from '@tanstack/react-query';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';

import {
  SHOW_RUN_REVIEW_CURRENT_DAY_REFETCH_INTERVAL_MS,
} from '@/features/show-run-review/lib/show-run-review-date-range';
import { apiClient } from '@/lib/api/client';

export type GetShowRunReviewSummaryParams = {
  date_from: string;
  date_to: string;
};

export const showRunReviewSummaryKeys = {
  all: ['show-run-review-summary'] as const,
  detail: (studioId: string, params: GetShowRunReviewSummaryParams) =>
    [...showRunReviewSummaryKeys.all, studioId, params] as const,
};

export async function getShowRunReviewSummary(
  studioId: string,
  params: GetShowRunReviewSummaryParams,
): Promise<ShowRunReviewSummary> {
  const response = await apiClient.get<ShowRunReviewSummary>(
    `/studios/${studioId}/shows/run-review`,
    {
      params,
    },
  );
  return response.data;
}

export function useShowRunReviewSummaryQuery(
  studioId: string,
  params: GetShowRunReviewSummaryParams,
  isCurrentDay = false,
) {
  return useQuery({
    queryKey: showRunReviewSummaryKeys.detail(studioId, params),
    queryFn: () => getShowRunReviewSummary(studioId, params),
    refetchInterval: isCurrentDay ? SHOW_RUN_REVIEW_CURRENT_DAY_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: isCurrentDay,
    staleTime: 5000,
  });
}
