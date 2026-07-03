import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CostsShiftsQueryInput, PaginatedShiftCostsResponse } from '@eridu/api-types/costs';

import { studioCostsKeys } from './get-costs-summary';

import { apiClient } from '@/lib/api/client';

// `CostsShiftsQueryInput` is the pre-transform (z.input) shape: `sort` is the
// raw `<field>:<asc|desc>` query string the backend parses itself, and
// `page`/`limit` are `z.coerce.number()` inputs (typed `unknown` before
// coercion). Override both so callers pass what actually goes over the wire.
export type CostsShiftsParams = Omit<CostsShiftsQueryInput, 'page' | 'limit' | 'sort'> & {
  page?: number;
  limit?: number;
  sort?: string;
};

export async function getCostsShifts(
  studioId: string,
  params: CostsShiftsParams,
  options?: { signal?: AbortSignal },
): Promise<PaginatedShiftCostsResponse> {
  const response = await apiClient.get<PaginatedShiftCostsResponse>(
    `/studios/${studioId}/costs/shifts`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useCostsShiftsQuery(
  studioId: string,
  params: CostsShiftsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: studioCostsKeys.shifts(studioId, params),
    queryFn: ({ signal }) => getCostsShifts(studioId, params, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}
