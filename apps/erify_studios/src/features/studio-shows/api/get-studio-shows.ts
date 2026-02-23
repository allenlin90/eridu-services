import type { ShowWithTaskSummaryDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export type StudioShow = ShowWithTaskSummaryDto;
export type ShowSelection = Pick<StudioShow, 'id' | 'name' | 'task_summary'>;

export const studioShowsKeys = {
  all: ['studio-shows'] as const,
  lists: () => [...studioShowsKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...studioShowsKeys.lists(), studioId] as const,
  list: (studioId: string, filters?: unknown) => [...studioShowsKeys.lists(), studioId, filters] as const,
};

type GetStudioShowsParams = {
  page?: number;
  limit?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  has_tasks?: boolean;
  client_name?: string;
  show_type_name?: string;
  show_standard_name?: string;
  show_status_name?: string;
  platform_name?: string;
};

type StudioShowsResponse = {
  data: StudioShow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getStudioShows(studioId: string, params: GetStudioShowsParams): Promise<StudioShowsResponse> {
  const response = await apiClient.get<StudioShowsResponse>(`/studios/${studioId}/shows`, { params });
  return response.data;
}
