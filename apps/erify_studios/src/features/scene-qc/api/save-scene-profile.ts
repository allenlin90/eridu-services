import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { SaveSceneProfileInput, SceneProfileApiResponse } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function saveSceneProfile(
  studioId: string,
  clientId: string,
  body: SaveSceneProfileInput,
): Promise<SceneProfileApiResponse> {
  const response = await apiClient.put<SceneProfileApiResponse>(
    `/studios/${studioId}/scene-profiles/${clientId}`,
    body,
  );
  return response.data;
}

export function useSaveSceneProfile(studioId: string, clientId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SaveSceneProfileInput) => {
      if (!clientId) {
        return Promise.reject(new Error('clientId is required'));
      }
      return saveSceneProfile(studioId, clientId, body);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(sceneQcKeys.profile(studioId, clientId), profile);
      void queryClient.invalidateQueries({ queryKey: sceneQcKeys.profile(studioId, clientId) });
    },
  });
}
