import { useQuery } from '@tanstack/react-query';

import type { ClientMechanicApiResponse } from '@eridu/api-types/client-mechanics';

import { apiClient } from '@/lib/api/client';

export async function getClientMechanic(
  studioId: string,
  clientId: string,
  mechanicId: string,
  options?: { signal?: AbortSignal },
): Promise<ClientMechanicApiResponse> {
  const response = await apiClient.get<ClientMechanicApiResponse>(
    `/studios/${studioId}/clients/${clientId}/mechanics/${mechanicId}`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useClientMechanicQuery(
  studioId: string,
  clientId: string | undefined,
  mechanicId: string,
) {
  return useQuery({
    queryKey: ['client-mechanics', 'detail', studioId, clientId, mechanicId],
    queryFn: ({ signal }) =>
      clientId
        ? getClientMechanic(studioId, clientId, mechanicId, { signal })
        : Promise.reject(new Error('clientId is required')),
    enabled: Boolean(studioId && clientId && mechanicId),
  });
}
