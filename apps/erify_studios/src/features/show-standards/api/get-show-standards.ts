import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowStandardApiResponse } from '@eridu/api-types/show-standards';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type ShowStandard = ShowStandardApiResponse;
export type ShowStandardsResponse = PaginatedResponse<ShowStandard>;

export type GetShowStandardsParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

export async function getShowStandards(params: GetShowStandardsParams): Promise<ShowStandardsResponse> {
  const response = await apiClient.get<ShowStandardsResponse>('/admin/show-standards', { params });
  return response.data;
}

export function useShowStandardsQuery(params: GetShowStandardsParams) {
  return useQuery({
    queryKey: ['show-standards', 'list', params],
    queryFn: () => getShowStandards(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
