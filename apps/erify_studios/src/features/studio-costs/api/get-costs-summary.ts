import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CostsQuery, CostsSummaryResponse } from '@eridu/api-types/costs';

import { apiClient } from '@/lib/api/client';

export const studioCostsKeys = {
  all: ['studio-costs'] as const,
  summary: (studioId: string, filters?: unknown) => [...studioCostsKeys.all, 'summary', studioId, filters] as const,
  shows: (studioId: string, filters?: unknown) => [...studioCostsKeys.all, 'shows', studioId, filters] as const,
  shifts: (studioId: string, filters?: unknown) => [...studioCostsKeys.all, 'shifts', studioId, filters] as const,
};

export async function getCostsSummary(
  studioId: string,
  params: CostsQuery,
  options?: { signal?: AbortSignal },
): Promise<CostsSummaryResponse> {
  const response = await apiClient.get<CostsSummaryResponse>(
    `/studios/${studioId}/costs/summary`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useCostsSummaryQuery(studioId: string, params: CostsQuery) {
  return useQuery({
    queryKey: studioCostsKeys.summary(studioId, params),
    queryFn: ({ signal }) => getCostsSummary(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
