import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { SceneQcDailyItemsResponse, SceneQcReviewState } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';
import { OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS } from '@/lib/operational-day-range';

export type SceneQcItemsParams = {
  operational_date: string;
  client_id?: string;
  platform_id?: string;
  review_state: SceneQcReviewState;
  search?: string;
  page: number;
  limit: number;
};

export async function getSceneQcItems(
  studioId: string,
  params: SceneQcItemsParams,
  options?: { signal?: AbortSignal },
): Promise<SceneQcDailyItemsResponse> {
  const response = await apiClient.get<SceneQcDailyItemsResponse>(
    `/studios/${studioId}/scene-qc/items`,
    { params, signal: options?.signal },
  );
  return response.data;
}

export function useSceneQcItemsQuery(
  studioId: string,
  params: SceneQcItemsParams,
  options: { isCurrentDay: boolean },
) {
  return useQuery({
    queryKey: sceneQcKeys.items(studioId, params.operational_date, params),
    queryFn: ({ signal }) => getSceneQcItems(studioId, params, { signal }),
    enabled: Boolean(studioId && params.operational_date),
    placeholderData: keepPreviousData,
    refetchInterval: options.isCurrentDay ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
}
