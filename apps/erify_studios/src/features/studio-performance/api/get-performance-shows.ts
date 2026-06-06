import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PaginatedShowPerformanceResponse, PerformanceShowsQuery } from '@eridu/api-types/performance';

import { studioPerformanceKeys } from './get-performance-summary';

import { apiClient } from '@/lib/api/client';

export async function getPerformanceShows(
  studioId: string,
  params: PerformanceShowsQuery,
  options?: { signal?: AbortSignal },
): Promise<PaginatedShowPerformanceResponse> {
  const response = await apiClient.get<PaginatedShowPerformanceResponse>(
    `/studios/${studioId}/performance/shows`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function usePerformanceShowsQuery(studioId: string, params: PerformanceShowsQuery) {
  return useQuery({
    queryKey: studioPerformanceKeys.shows(studioId, params),
    queryFn: ({ signal }) => getPerformanceShows(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
