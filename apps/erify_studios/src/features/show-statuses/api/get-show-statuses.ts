import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowStatusApiResponse } from '@eridu/api-types/show-statuses';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type ShowStatus = ShowStatusApiResponse;
export type ShowStatusesResponse = PaginatedResponse<ShowStatus>;

export type GetShowStatusesParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

export async function getShowStatuses(params: GetShowStatusesParams): Promise<ShowStatusesResponse> {
  const response = await apiClient.get<ShowStatusesResponse>('/admin/show-statuses', { params });
  return response.data;
}

export function useShowStatusesQuery(params: GetShowStatusesParams) {
  return useQuery({
    queryKey: ['show-statuses', 'list', params],
    queryFn: () => getShowStatuses(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
