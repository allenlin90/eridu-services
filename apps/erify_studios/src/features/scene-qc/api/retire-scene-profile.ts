import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function retireSceneProfile(
  studioId: string,
  clientId: string,
  version?: number,
): Promise<void> {
  await apiClient.delete(
    `/studios/${studioId}/scene-profiles/${clientId}`,
    { params: version !== undefined ? { version } : undefined },
  );
}

export function useRetireSceneProfile(studioId: string, clientId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (version?: number) => {
      if (!clientId) {
        return Promise.reject(new Error('clientId is required'));
      }
      return retireSceneProfile(studioId, clientId, version);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sceneQcKeys.profile(studioId, clientId) });
    },
  });
}
