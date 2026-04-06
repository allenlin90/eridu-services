import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { studioShowKeys } from './get-studio-show';
import { studioShowsKeys } from './get-studio-shows';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

const DELETE_ERROR_MESSAGES: Record<string, string> = {
  SHOW_ALREADY_STARTED: 'Shows can only be deleted before the start time.',
};

export async function deleteStudioShow(
  studioId: string,
  showId: string,
): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/shows/${showId}`);
}

export function useDeleteStudioShow(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (showId: string) => deleteStudioShow(studioId, showId),
    onSuccess: async (_, showId) => {
      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: [showId],
      });
      queryClient.removeQueries({ queryKey: studioShowKeys.detail(studioId, showId) });
      await queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
      toast.success('Show deleted');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to delete show', DELETE_ERROR_MESSAGES));
    },
  });
}
