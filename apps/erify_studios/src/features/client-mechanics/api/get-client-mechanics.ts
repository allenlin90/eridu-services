import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ClientMechanicApiResponse, ListClientMechanicsFilter } from '@eridu/api-types/client-mechanics';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type ClientMechanic = ClientMechanicApiResponse;
export type ClientMechanicsResponse = PaginatedResponse<ClientMechanic>;

export type GetClientMechanicsParams = ListClientMechanicsFilter & {
  page?: number;
  limit?: number;
};

type GetClientMechanicsOptions = {
  signal?: AbortSignal;
};

export async function getClientMechanics(
  studioId: string,
  clientId: string,
  params: GetClientMechanicsParams,
  options?: GetClientMechanicsOptions,
): Promise<ClientMechanicsResponse> {
  const response = await apiClient.get<ClientMechanicsResponse>(
    `/studios/${studioId}/clients/${clientId}/mechanics`,
    {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status || undefined,
      },
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useClientMechanicsQuery(
  studioId: string,
  clientId: string | undefined,
  params: GetClientMechanicsParams,
) {
  return useQuery({
    queryKey: ['client-mechanics', 'list', studioId, clientId, params],
    queryFn: ({ signal }) =>
      clientId
        ? getClientMechanics(studioId, clientId, params, { signal })
        : Promise.resolve({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    enabled: Boolean(studioId && clientId),
    placeholderData: keepPreviousData,
  });
}
