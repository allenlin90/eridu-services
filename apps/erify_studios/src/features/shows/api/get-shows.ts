import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowApiResponse } from '@eridu/api-types/shows';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Show = ShowApiResponse & {
  mcs: { mc_name: string }[];
  platforms: { platform_name: string }[];
};

export type ShowsResponse = PaginatedResponse<Show>;

export type GetShowsParams = {
  page?: number;
  limit?: number;
  name?: string;
  client_name?: string;
  mc_name?: string;
  start_date_from?: string;
  start_date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  id?: string;
};

export async function getShows(params: GetShowsParams): Promise<ShowsResponse> {
  const response = await apiClient.get<ShowsResponse>('/admin/shows', {
    params: {
      page: params.page,
      limit: params.limit,
      name: params.name,
      client_name: params.client_name,
      mc_name: params.mc_name,
      start_date_from: params.start_date_from,
      start_date_to: params.start_date_to,
      order_by: params.sortBy,
      order_direction: params.sortOrder,
      id: params.id,
    },
  });
  return response.data;
}

export function useShowsQuery(params: GetShowsParams) {
  return useQuery({
    queryKey: ['shows', 'list', params],
    queryFn: () => getShows(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
