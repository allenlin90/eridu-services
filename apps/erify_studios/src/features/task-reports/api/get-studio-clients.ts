import type { ClientApiResponse } from '@eridu/api-types/clients';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type StudioClientsResponse = PaginatedResponse<ClientApiResponse>;

type GetStudioClientsOptions = {
  signal?: AbortSignal;
};

export async function getStudioClients(
  studioId: string,
  params: { page?: number; limit?: number; name?: string },
  options?: GetStudioClientsOptions,
): Promise<StudioClientsResponse> {
  const response = await apiClient.get<StudioClientsResponse>(
    `/studios/${studioId}/clients`,
    {
      params: {
        page: params.page,
        limit: params.limit,
        name: params.name,
      },
      signal: options?.signal,
    },
  );

  return response.data;
}
