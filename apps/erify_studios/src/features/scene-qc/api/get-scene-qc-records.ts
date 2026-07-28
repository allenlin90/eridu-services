import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { SceneQcRecordsResponse, SceneQcResult } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export type SceneQcRecordsParams = {
  date_from: string;
  date_to: string;
  client_id?: string;
  platform_id?: string;
  result?: SceneQcResult;
  page: number;
  limit: number;
};

export async function getSceneQcRecords(
  studioId: string,
  params: SceneQcRecordsParams,
  options?: { signal?: AbortSignal },
): Promise<SceneQcRecordsResponse> {
  const response = await apiClient.get<SceneQcRecordsResponse>(
    `/studios/${studioId}/scene-qc-records`,
    { params, signal: options?.signal },
  );
  return response.data;
}

/** Records is a historical query over pinned operational dates -- it never polls (§8.4). */
export function useSceneQcRecordsQuery(studioId: string, params: SceneQcRecordsParams) {
  return useQuery({
    queryKey: sceneQcKeys.records(studioId, params),
    queryFn: ({ signal }) => getSceneQcRecords(studioId, params, { signal }),
    enabled: Boolean(studioId && params.date_from && params.date_to),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
}
