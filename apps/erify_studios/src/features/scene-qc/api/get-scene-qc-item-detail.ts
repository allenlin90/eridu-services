import { useQuery } from '@tanstack/react-query';

import type { SceneQcDailyItemDetail } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function getSceneQcItemDetail(
  studioId: string,
  showId: string,
  operationalDate: string,
  options?: { signal?: AbortSignal },
): Promise<SceneQcDailyItemDetail> {
  const response = await apiClient.get<SceneQcDailyItemDetail>(
    `/studios/${studioId}/scene-qc/items/${showId}`,
    { params: { operational_date: operationalDate }, signal: options?.signal },
  );
  return response.data;
}

/** Enabled only with a valid selected Show (§8.4). */
export function useSceneQcItemDetailQuery(studioId: string, operationalDate: string, showId: string | undefined) {
  return useQuery({
    queryKey: sceneQcKeys.itemDetail(studioId, operationalDate, showId),
    queryFn: ({ signal }) => getSceneQcItemDetail(studioId, showId as string, operationalDate, { signal }),
    enabled: Boolean(studioId && operationalDate && showId),
  });
}
