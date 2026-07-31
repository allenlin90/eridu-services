import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function retireSceneProfile(
  studioId: string,
  clientId: string,
  version: number,
): Promise<void> {
  await apiClient.delete(
    `/studios/${studioId}/scene-profiles/${clientId}`,
    { params: { version } },
  );
}

export function useRetireSceneProfile(studioId: string, clientId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (version: number) => {
      if (!clientId) {
        return Promise.reject(new Error('clientId is required'));
      }
      return retireSceneProfile(studioId, clientId, version);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sceneQcKeys.profile(studioId, clientId) });
      // Retiring a Scene Profile should surface the "no Scene Profile" warning
      // on the Daily Review workspace for Shows of this Client (§3.6).
      void queryClient.invalidateQueries({ queryKey: sceneQcKeys.dailyPrefix(studioId) });
    },
  });
}
