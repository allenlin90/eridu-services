import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowApiResponse } from '@eridu/api-types/shows';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Show = ShowApiResponse & {
  // Legacy backend field kept for compatibility while frontend migrates to creators.
  mcs: { id: string; mc_id: string; mc_name: string }[];
  creators: { id: string; creator_id: string; creator_name: string }[];
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
  type LegacyShowCreatorAssignment = { id: string; mc_id: string; mc_name: string };
  type RawShow = ShowApiResponse & {
    mcs: { id: string; mc_id: string; mc_name: string }[];
    platforms: { id: string; platform_id: string; platform_name: string }[];
  };

  const response = await apiClient.get<PaginatedResponse<RawShow>>('/admin/shows', {
    params: {
      page: params.page,
      limit: params.limit,
      name: params.name,
      client_name: params.client_name,
      mc_name: params.creator_name,
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
  return {
    ...response.data,
    data: response.data.data.map((show) => ({
      ...show,
      creators: (show.mcs ?? []).map((assignment: LegacyShowCreatorAssignment) => ({
        id: assignment.id,
        creator_id: assignment.mc_id,
        creator_name: assignment.mc_name,
      })),
    })),
  };
}

export function useShowsQuery(params: GetShowsParams) {
  return useQuery({
    queryKey: ['shows', 'list', params],
    queryFn: () => getShows(params),
    placeholderData: keepPreviousData,
  });
}
