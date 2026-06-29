import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type GetSchedulePublishImpactsParams = {
  page?: number;
  limit?: number;
  start_date_from?: string;
  start_date_to?: string;
};

export const schedulePublishImpactKeys = {
  all: ['schedule-publish-impacts'] as const,
  lists: () => [...schedulePublishImpactKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...schedulePublishImpactKeys.lists(), studioId] as const,
  list: (studioId: string, params: GetSchedulePublishImpactsParams) =>
    [...schedulePublishImpactKeys.listPrefix(studioId), params] as const,
};

export async function getSchedulePublishImpacts(
  studioId: string,
  params: GetSchedulePublishImpactsParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<SchedulePublishImpactRow>> {
  const response = await apiClient.get<PaginatedResponse<SchedulePublishImpactRow>>(
    `/studios/${studioId}/shows/schedule-publish-impacts`,
    { params, signal },
  );
  return response.data;
}

export function useSchedulePublishImpactsQuery(
  studioId: string,
  params: GetSchedulePublishImpactsParams,
) {
  return useQuery({
    queryKey: schedulePublishImpactKeys.list(studioId, params),
    queryFn: ({ signal }) => getSchedulePublishImpacts(studioId, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });
}
