import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Mc = CreatorApiResponse;
export type McsResponse = PaginatedResponse<Mc>;

export type GetMcsParams = {
  page?: number;
  limit?: number;
  name?: string;
  alias_name?: string;
  id?: string;
};

export async function getMcs(params: GetMcsParams): Promise<McsResponse> {
  const response = await apiClient.get<McsResponse>('/admin/creators', { params });
  return response.data;
}

export function useMcsQuery(params: GetMcsParams) {
  return useQuery({
    queryKey: ['mcs', 'list', params],
    queryFn: () => getMcs(params),
    placeholderData: keepPreviousData,
  });
}
