import { useQuery } from '@tanstack/react-query';

import type { ShowPlanningReadiness } from '@eridu/api-types/shows';

import { apiClient } from '@/lib/api/client';

export const showPlanningReadinessKeys = {
  all: ['studio-show', 'planning-readiness'] as const,
  detail: (studioId: string, showId: string) => [...showPlanningReadinessKeys.all, 'detail', studioId, showId] as const,
  bulk: (studioId: string, showIds: string[]) => [...showPlanningReadinessKeys.all, 'bulk', studioId, ...showIds] as const,
};

export async function getShowPlanningReadiness(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<ShowPlanningReadiness> {
  const response = await apiClient.get<ShowPlanningReadiness>(
    `/studios/${studioId}/shows/${showId}/planning-readiness`,
    { signal: options?.signal },
  );
  return response.data;
}

export async function getShowsPlanningReadiness(
  studioId: string,
  showIds: string[],
  options?: { signal?: AbortSignal },
): Promise<ShowPlanningReadiness[]> {
  if (showIds.length === 0) {
    return [];
  }
  const response = await apiClient.get<ShowPlanningReadiness[]>(
    `/studios/${studioId}/shows/planning-readiness`,
    { params: { show_id: showIds }, signal: options?.signal },
  );
  return response.data;
}

export function useShowPlanningReadiness(
  studioId: string,
  showId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: showPlanningReadinessKeys.detail(studioId, showId),
    queryFn: ({ signal }) => getShowPlanningReadiness(studioId, showId, { signal }),
    enabled: options?.enabled ?? true,
  });
}

export function useShowsPlanningReadiness(
  studioId: string,
  showIds: string[],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: showPlanningReadinessKeys.bulk(studioId, showIds),
    queryFn: ({ signal }) => getShowsPlanningReadiness(studioId, showIds, { signal }),
    enabled: (options?.enabled ?? true) && showIds.length > 0,
  });
}
