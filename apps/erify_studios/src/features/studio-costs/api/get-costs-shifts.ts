import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CostsShiftsQuery, PaginatedShiftCostsResponse } from '@eridu/api-types/costs';

import { studioCostsKeys } from './get-costs-summary';

import { apiClient } from '@/lib/api/client';

export async function getCostsShifts(
  studioId: string,
  params: CostsShiftsQuery,
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
  params: CostsShiftsQuery,
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
