import { useQuery } from '@tanstack/react-query';

import type { SceneQcRecordDetail } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function getSceneQcRecordDetail(
  studioId: string,
  reviewId: string,
  options?: { signal?: AbortSignal },
): Promise<SceneQcRecordDetail> {
  const response = await apiClient.get<SceneQcRecordDetail>(
    `/studios/${studioId}/scene-qc-records/${reviewId}`,
    { signal: options?.signal },
  );
  return response.data;
}

/** Detail only loads with a valid selection -- same "detail only with a valid selection" rule as the daily surface (§8.4). */
export function useSceneQcRecordDetailQuery(studioId: string, reviewId: string | undefined) {
  return useQuery({
    queryKey: sceneQcKeys.recordDetail(studioId, reviewId),
    queryFn: ({ signal }) => getSceneQcRecordDetail(studioId, reviewId!, { signal }),
    enabled: Boolean(studioId && reviewId),
    refetchInterval: false,
  });
}
