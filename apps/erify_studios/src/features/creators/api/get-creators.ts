import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Creator = CreatorApiResponse;
export type CreatorsResponse = PaginatedResponse<Creator>;

export type GetCreatorsParams = {
  page?: number;
  limit?: number;
  name?: string;
  alias_name?: string;
  id?: string;
};

export async function getCreators(params: GetCreatorsParams): Promise<CreatorsResponse> {
  const response = await apiClient.get<CreatorsResponse>('/admin/creators', { params });
  return response.data;
}

export function useCreatorsQuery(params: GetCreatorsParams) {
  return useQuery({
    queryKey: ['creators', 'list', params],
    queryFn: () => getCreators(params),
    placeholderData: keepPreviousData,
  });
}
