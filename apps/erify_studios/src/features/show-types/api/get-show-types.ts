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

export async function getShowTypes(
  params: GetShowTypesParams,
  studioId?: string,
): Promise<ShowTypesResponse> {
  const endpoint = studioId ? `/studios/${studioId}/show-types` : '/admin/show-types';
  const response = await apiClient.get<ShowTypesResponse>(endpoint, { params });
  return response.data;
}

export function useShowTypesQuery(params: GetShowTypesParams) {
  return useQuery({
    queryKey: ['show-types', 'list', params],
    queryFn: () => getShowTypes(params),
    placeholderData: keepPreviousData,
  });
}
