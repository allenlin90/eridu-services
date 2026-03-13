import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showCreatorsKeys } from './get-show-creators';

import { studioShowKeys } from '@/features/studio-shows/api/get-studio-show';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { apiClient } from '@/lib/api/client';

async function removeShowCreator(studioId: string, showId: string, creatorId: string): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/shows/${showId}/creators/${creatorId}`);
}

export function useRemoveShowCreator(studioId: string, showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creatorId: string) => removeShowCreator(studioId, showId, creatorId),
    meta: {
      errorMessage: 'Failed to remove creator',
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: showCreatorsKeys.list(studioId, showId) }),
        queryClient.invalidateQueries({ queryKey: studioShowKeys.detail(studioId, showId) }),
        queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) }),
      ]);
    },
  });
}
