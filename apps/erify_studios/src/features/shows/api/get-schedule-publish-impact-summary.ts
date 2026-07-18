import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { SchedulePublishImpactSummary } from '@eridu/api-types/shows';

import type { GetSchedulePublishImpactsParams } from './get-schedule-publish-impacts';
import { schedulePublishImpactKeys } from './get-schedule-publish-impacts';

import { apiClient } from '@/lib/api/client';

/** Same filter set as the list; pagination params are meaningless for counts. */
export type GetSchedulePublishImpactSummaryParams = Omit<
  GetSchedulePublishImpactsParams,
  'page' | 'limit'
>;

export const schedulePublishImpactSummaryKeys = {
  summary: (studioId: string, params: GetSchedulePublishImpactSummaryParams) =>
    [...schedulePublishImpactKeys.all, 'summary', studioId, params] as const,
};

export async function getSchedulePublishImpactSummary(
  studioId: string,
  params: GetSchedulePublishImpactSummaryParams,
  signal?: AbortSignal,
): Promise<SchedulePublishImpactSummary> {
  const response = await apiClient.get<SchedulePublishImpactSummary>(
    `/studios/${studioId}/shows/schedule-publish-impacts/summary`,
    { params, signal },
  );
  return response.data;
}

export function useSchedulePublishImpactSummaryQuery(
  studioId: string,
  params: GetSchedulePublishImpactSummaryParams,
) {
  return useQuery({
    queryKey: schedulePublishImpactSummaryKeys.summary(studioId, params),
    queryFn: ({ signal }) => getSchedulePublishImpactSummary(studioId, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });
}
