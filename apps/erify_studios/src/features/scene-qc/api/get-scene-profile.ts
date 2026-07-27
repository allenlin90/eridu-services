import { useQuery } from '@tanstack/react-query';

import type { SceneProfileApiResponse } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function getSceneProfile(
  studioId: string,
  clientId: string,
  options?: { signal?: AbortSignal },
): Promise<SceneProfileApiResponse> {
  const response = await apiClient.get<SceneProfileApiResponse>(
    `/studios/${studioId}/scene-profiles/${clientId}`,
    { signal: options?.signal },
  );
  return response.data;
}

export function useSceneProfileQuery(studioId: string, clientId: string | undefined) {
  return useQuery({
    queryKey: sceneQcKeys.profile(studioId, clientId),
    queryFn: ({ signal }) =>
      clientId
        ? getSceneProfile(studioId, clientId, { signal })
        : Promise.reject(new Error('clientId is required')),
    enabled: Boolean(studioId && clientId),
    retry: false,
  });
}
