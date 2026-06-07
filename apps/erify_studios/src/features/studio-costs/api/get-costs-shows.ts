import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CostsShowsQuery, PaginatedShowCostsResponse } from '@eridu/api-types/costs';

import { studioCostsKeys } from './get-costs-summary';

import { apiClient } from '@/lib/api/client';

export async function getCostsShows(
  studioId: string,
  params: CostsShowsQuery,
  options?: { signal?: AbortSignal },
): Promise<PaginatedShowCostsResponse> {
  const response = await apiClient.get<PaginatedShowCostsResponse>(
    `/studios/${studioId}/costs/shows`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useCostsShowsQuery(studioId: string, params: CostsShowsQuery) {
  return useQuery({
    queryKey: studioCostsKeys.shows(studioId, params),
    queryFn: ({ signal }) => getCostsShows(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
