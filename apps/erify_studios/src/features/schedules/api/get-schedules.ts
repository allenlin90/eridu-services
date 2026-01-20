import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ScheduleApiResponse } from '@eridu/api-types/schedules';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Schedule = ScheduleApiResponse;

export type SchedulesResponse = PaginatedResponse<Schedule>;

export type GetSchedulesParams = {
  page?: number;
  limit?: number;
  name?: string;
  client_name?: string;
  id?: string;
};

export async function getSchedules(params: GetSchedulesParams): Promise<SchedulesResponse> {
  const response = await apiClient.get<SchedulesResponse>('/admin/schedules', {
    params,
  });
  return response.data;
}

export function useSchedulesQuery(params: GetSchedulesParams) {
  return useQuery({
    queryKey: ['schedules', 'list', params],
    queryFn: () => getSchedules(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
