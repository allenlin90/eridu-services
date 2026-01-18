import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowTypeApiResponse } from '@eridu/api-types/show-types';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type ShowType = ShowTypeApiResponse;
export type ShowTypesResponse = PaginatedResponse<ShowType>;

export type GetShowTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

export async function getShowTypes(params: GetShowTypesParams): Promise<ShowTypesResponse> {
  const response = await apiClient.get<ShowTypesResponse>('/admin/show-types', { params });
  return response.data;
}

export function useShowTypesQuery(params: GetShowTypesParams) {
  return useQuery({
    queryKey: ['show-types', 'list', params],
    queryFn: () => getShowTypes(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
