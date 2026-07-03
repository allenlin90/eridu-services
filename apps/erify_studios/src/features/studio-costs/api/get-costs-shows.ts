import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CostsShowsQueryInput, PaginatedShowCostsResponse } from '@eridu/api-types/costs';

import { studioCostsKeys } from './get-costs-summary';

import { apiClient } from '@/lib/api/client';

// `CostsShowsQueryInput` is the pre-transform (z.input) shape: `sort` is the
// raw `<field>:<asc|desc>` query string the backend parses itself, and
// `page`/`limit` are `z.coerce.number()` inputs (typed `unknown` before
// coercion). Override both so callers pass what actually goes over the wire.
export type CostsShowsParams = Omit<CostsShowsQueryInput, 'page' | 'limit' | 'sort'> & {
  page?: number;
  limit?: number;
  sort?: string;
};

export async function getCostsShows(
  studioId: string,
  params: CostsShowsParams,
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

export function useCostsShowsQuery(
  studioId: string,
  params: CostsShowsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: studioCostsKeys.shows(studioId, params),
    queryFn: ({ signal }) => getCostsShows(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}
