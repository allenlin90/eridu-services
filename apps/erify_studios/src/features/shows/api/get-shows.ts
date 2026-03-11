import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowApiResponse } from '@eridu/api-types/shows';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Show = ShowApiResponse & {
  creators?: { id: string; creator_id: string; creator_name: string }[];
  platforms: { id: string; platform_id: string; platform_name: string }[];
};

export type ShowsResponse = PaginatedResponse<Show>;

export type GetShowsParams = {
  page?: number;
  limit?: number;
  name?: string;
  client_name?: string;
  creator_name?: string;
  start_date_from?: string;
  start_date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  id?: string;
  show_standard_name?: string;
  show_status_name?: string;
  platform_name?: string;
};

export async function getShows(params: GetShowsParams): Promise<ShowsResponse> {
  const response = await apiClient.get<ShowsResponse>('/admin/shows', {
    params: {
      page: params.page,
      limit: params.limit,
      name: params.name,
      client_name: params.client_name,
      creator_name: params.creator_name,
      start_date_from: params.start_date_from,
      start_date_to: params.start_date_to,
      order_by: params.sortBy,
      order_direction: params.sortOrder,
      id: params.id,
      show_standard_name: params.show_standard_name,
      show_status_name: params.show_status_name,
      platform_name: params.platform_name,
    },
  });
  return response.data;
}

export function useShowsQuery(params: GetShowsParams) {
  return useQuery({
    queryKey: ['shows', 'list', params],
    queryFn: () => getShows(params),
    placeholderData: keepPreviousData,
  });
}
