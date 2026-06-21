import { useQuery } from '@tanstack/react-query';

import type {
  ClientMechanicCoverageResponse,
  ShowMechanicCoverageResponse,
} from '@eridu/api-types/client-mechanics';

import { apiClient } from '@/lib/api/client';

export type MechanicCoverageParams = {
  start_date: string;
  end_date: string;
};

export async function getMechanicCoverage(
  studioId: string,
  clientId: string,
  mechanicId: string,
  params: MechanicCoverageParams,
  options?: { signal?: AbortSignal },
): Promise<ClientMechanicCoverageResponse> {
  const response = await apiClient.get<ClientMechanicCoverageResponse>(
    `/studios/${studioId}/clients/${clientId}/mechanics/${mechanicId}/coverage`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useMechanicCoverageQuery(
  studioId: string,
  clientId: string | undefined,
  mechanicId: string,
  params: MechanicCoverageParams,
) {
  return useQuery({
    queryKey: ['client-mechanics', 'coverage', studioId, clientId, mechanicId, params],
    queryFn: ({ signal }) =>
      clientId
        ? getMechanicCoverage(studioId, clientId, mechanicId, params, { signal })
        : Promise.reject(new Error('clientId is required')),
    enabled: Boolean(studioId && clientId && mechanicId),
  });
}

export async function getShowMechanicsCoverage(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<ShowMechanicCoverageResponse> {
  const response = await apiClient.get<ShowMechanicCoverageResponse>(
    `/studios/${studioId}/shows/${showId}/mechanics-coverage`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useShowMechanicsCoverageQuery(studioId: string, showId: string) {
  return useQuery({
    queryKey: ['shows', 'mechanics-coverage', studioId, showId],
    queryFn: ({ signal }) => getShowMechanicsCoverage(studioId, showId, { signal }),
    enabled: Boolean(studioId && showId),
  });
}
