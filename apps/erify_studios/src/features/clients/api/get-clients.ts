import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ClientApiResponse } from '@eridu/api-types/clients';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Client = ClientApiResponse;

export type ClientsResponse = PaginatedResponse<Client>;

export type GetClientsParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

type GetClientsOptions = {
  signal?: AbortSignal;
};

export async function getClients(
  params: GetClientsParams,
  studioId?: string,
  options?: GetClientsOptions,
): Promise<ClientsResponse> {
  const endpoint = studioId ? `/studios/${studioId}/clients` : '/admin/clients';
  const response = await apiClient.get<ClientsResponse>(endpoint, {
    params: {
      page: params.page,
      limit: params.limit,
      name: params.name,
      id: params.id,
    },
    signal: options?.signal,
  });
  return response.data;
}

export function useClientsQuery(params: GetClientsParams) {
  return useQuery({
    queryKey: ['clients', 'list', params],
    queryFn: () => getClients(params),
    placeholderData: keepPreviousData,
  });
}
