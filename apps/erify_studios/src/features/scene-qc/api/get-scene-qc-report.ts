import { useQuery } from '@tanstack/react-query';

import type { SceneQcReport } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function getSceneQcReport(
  studioId: string,
  confirmationId: string,
  options?: { signal?: AbortSignal },
): Promise<SceneQcReport> {
  const response = await apiClient.get<SceneQcReport>(
    `/studios/${studioId}/scene-qc-confirmations/${confirmationId}/report`,
    { signal: options?.signal },
  );
  return response.data;
}

/** An immutable artifact keyed by confirmation UID -- never polls, `staleTime: Infinity` (§8.4). */
export function useSceneQcReportQuery(studioId: string, confirmationId: string | undefined) {
  return useQuery({
    queryKey: sceneQcKeys.report(studioId, confirmationId),
    queryFn: ({ signal }) => getSceneQcReport(studioId, confirmationId!, { signal }),
    enabled: Boolean(studioId && confirmationId),
    staleTime: Infinity,
    refetchInterval: false,
  });
}
