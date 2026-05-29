import { useQuery } from '@tanstack/react-query';

import type { StudioCreatorCompensationResponse } from '@eridu/api-types/studio-creators';

import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

export type ListCompensationsParams = {
  studio_id: string;
  date_from: string;
  date_to: string;
};

/**
 * Fetch show compensations for current user over a date range in a studio
 */
export async function getMyShowCompensations(
  params: ListCompensationsParams,
  signal?: AbortSignal,
): Promise<StudioCreatorCompensationResponse> {
  const { data } = await apiClient.get<StudioCreatorCompensationResponse>(
    '/me/show-compensations',
    {
      params,
      signal,
    },
  );
  return data;
}

/**
 * Hook: useMyShowCompensations
 * Fetches show-based compensations for the current user
 */
export function useMyShowCompensations(params: ListCompensationsParams) {
  return useQuery({
    queryKey: queryKeys.compensations.list(params),
    queryFn: ({ signal }) => getMyShowCompensations(params, signal),
    enabled: !!params.studio_id && !!params.date_from && !!params.date_to,
  });
}
