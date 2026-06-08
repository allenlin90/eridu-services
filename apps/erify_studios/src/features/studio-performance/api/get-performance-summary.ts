import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PerformanceQuery, PerformanceSummaryResponse } from '@eridu/api-types/performance';

import { apiClient } from '@/lib/api/client';

export const studioPerformanceKeys = {
  all: ['studio-performance'] as const,
  summary: (studioId: string, filters?: unknown) => [...studioPerformanceKeys.all, 'summary', studioId, filters] as const,
  shows: (studioId: string, filters?: unknown) => [...studioPerformanceKeys.all, 'shows', studioId, filters] as const,
  showsSeries: (studioId: string, filters?: unknown) => [...studioPerformanceKeys.all, 'shows-series', studioId, filters] as const,
};

export async function getPerformanceSummary(
  studioId: string,
  params: PerformanceQuery,
  options?: { signal?: AbortSignal },
): Promise<PerformanceSummaryResponse> {
  const response = await apiClient.get<PerformanceSummaryResponse>(
    `/studios/${studioId}/performance/summary`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function usePerformanceSummaryQuery(studioId: string, params: PerformanceQuery) {
  return useQuery({
    queryKey: studioPerformanceKeys.summary(studioId, params),
    queryFn: ({ signal }) => getPerformanceSummary(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
