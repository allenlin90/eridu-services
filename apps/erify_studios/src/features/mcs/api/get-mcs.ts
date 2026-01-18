import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { McApiResponse } from '@eridu/api-types/mcs';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Mc = McApiResponse;
export type McsResponse = PaginatedResponse<Mc>;

export type GetMcsParams = {
  page?: number;
  limit?: number;
  name?: string;
  alias_name?: string;
  id?: string;
};

export async function getMcs(params: GetMcsParams): Promise<McsResponse> {
  const response = await apiClient.get<McsResponse>('/admin/mcs', { params });
  return response.data;
}

export function useMcsQuery(params: GetMcsParams) {
  return useQuery({
    queryKey: ['mcs', 'list', params],
    queryFn: () => getMcs(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
