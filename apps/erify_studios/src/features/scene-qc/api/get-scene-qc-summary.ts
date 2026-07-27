import { useQuery } from '@tanstack/react-query';

import type { SceneQcDailySummary } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';
import { OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS } from '@/lib/operational-day-range';

export async function getSceneQcSummary(
  studioId: string,
  operationalDate: string,
  options?: { signal?: AbortSignal },
): Promise<SceneQcDailySummary> {
  const response = await apiClient.get<SceneQcDailySummary>(
    `/studios/${studioId}/scene-qc/summary`,
    { params: { operational_date: operationalDate }, signal: options?.signal },
  );
  return response.data;
}

export function useSceneQcSummaryQuery(
  studioId: string,
  operationalDate: string,
  options: { isCurrentDay: boolean },
) {
  return useQuery({
    queryKey: sceneQcKeys.summary(studioId, operationalDate),
    queryFn: ({ signal }) => getSceneQcSummary(studioId, operationalDate, { signal }),
    enabled: Boolean(studioId && operationalDate),
    refetchInterval: options.isCurrentDay ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
}
