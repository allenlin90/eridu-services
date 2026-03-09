import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ShowMc } from './get-show-mcs';
import { showMcKeys } from './get-show-mcs';

import { apiClient } from '@/lib/api/client';

export async function removeShowMc(
  studioId: string,
  showId: string,
  mcId: string,
): Promise<ShowMc> {
  const response = await apiClient.delete<ShowMc>(
    `/studios/${studioId}/shows/${showId}/creators/${mcId}`,
  );
  return response.data;
}

export function useRemoveShowMc(studioId: string, showId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mcId: string) => removeShowMc(studioId, showId, mcId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showMcKeys.list(studioId, showId) });
    },
  });
}
