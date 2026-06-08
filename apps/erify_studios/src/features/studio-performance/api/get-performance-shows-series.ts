import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PerformanceQuery, ShowPerformanceSeriesResponse } from '@eridu/api-types/performance';

import { studioPerformanceKeys } from './get-performance-summary';

import { apiClient } from '@/lib/api/client';

export async function getPerformanceShowsSeries(
  studioId: string,
  params: PerformanceQuery,
  options?: { signal?: AbortSignal },
): Promise<ShowPerformanceSeriesResponse> {
  const response = await apiClient.get<ShowPerformanceSeriesResponse>(
    `/studios/${studioId}/performance/shows-series`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function usePerformanceShowsSeriesQuery(
  studioId: string,
  params: PerformanceQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: studioPerformanceKeys.showsSeries(studioId, params),
    queryFn: ({ signal }) => getPerformanceShowsSeries(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}
