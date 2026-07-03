import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PaginatedShowPerformanceResponse, PerformanceShowsQueryInput } from '@eridu/api-types/performance';

import { studioPerformanceKeys } from './get-performance-summary';

import { apiClient } from '@/lib/api/client';

export type PerformanceShowsParams = Omit<PerformanceShowsQueryInput, 'page' | 'limit' | 'sort'> & {
  page?: number;
  limit?: number;
  sort?: string;
};

export async function getPerformanceShows(
  studioId: string,
  params: PerformanceShowsParams,
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

export function usePerformanceShowsQuery(studioId: string, params: PerformanceShowsParams) {
  return useQuery({
    queryKey: studioPerformanceKeys.shows(studioId, params),
    queryFn: ({ signal }) => getPerformanceShows(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
