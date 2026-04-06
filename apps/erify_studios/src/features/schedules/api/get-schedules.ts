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

type GetSchedulesOptions = {
  signal?: AbortSignal;
};

export async function getSchedules(
  params: GetSchedulesParams,
  studioId?: string,
  options?: GetSchedulesOptions,
): Promise<SchedulesResponse> {
  const endpoint = studioId ? `/studios/${studioId}/schedules` : '/admin/schedules';
  const response = await apiClient.get<SchedulesResponse>(endpoint, {
    params,
    signal: options?.signal,
  });
  return response.data;
}

export function useSchedulesQuery(params: GetSchedulesParams) {
  return useQuery({
    queryKey: ['schedules', 'list', params],
    queryFn: () => getSchedules(params),
    placeholderData: keepPreviousData,
  });
}
