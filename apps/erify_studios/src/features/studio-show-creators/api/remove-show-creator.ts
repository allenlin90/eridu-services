import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ShowCreator } from './get-show-creators';
import { showCreatorKeys } from './get-show-creators';

import { apiClient } from '@/lib/api/client';

export async function removeShowCreator(
  studioId: string,
  showId: string,
  mcId: string,
): Promise<ShowCreator> {
  const response = await apiClient.delete<ShowCreator>(
    `/studios/${studioId}/shows/${showId}/creators/${mcId}`,
  );
  return response.data;
}

export function useRemoveShowCreator(studioId: string, showId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mcId: string) => removeShowCreator(studioId, showId, mcId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showCreatorKeys.list(studioId, showId) });
    },
  });
}
