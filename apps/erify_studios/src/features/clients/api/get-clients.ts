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

export async function getClients(params: GetClientsParams): Promise<ClientsResponse> {
  const response = await apiClient.get<ClientsResponse>('/admin/clients', {
    params: {
      page: params.page,
      limit: params.limit,
      name: params.name,
      id: params.id,
    },
  });
  return response.data;
}

export function useClientsQuery(params: GetClientsParams) {
  return useQuery({
    queryKey: ['clients', 'list', params],
    queryFn: () => getClients(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
