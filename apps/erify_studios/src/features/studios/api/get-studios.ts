import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { StudioApiResponse } from '@eridu/api-types/studios';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Studio = StudioApiResponse;

export type StudiosResponse = PaginatedResponse<Studio>;

export type GetStudiosParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

export async function getStudios(params: GetStudiosParams): Promise<StudiosResponse> {
  const response = await apiClient.get<StudiosResponse>('/admin/studios', {
    params: {
      page: params.page,
      limit: params.limit,
      name: params.name,
      id: params.id,
    },
  });
  return response.data;
}

export function useStudiosQuery(params: GetStudiosParams) {
  return useQuery({
    queryKey: ['studios', 'list', params],
    queryFn: () => getStudios(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
