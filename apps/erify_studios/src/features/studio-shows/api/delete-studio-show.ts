import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import { studioShowKeys } from './get-studio-show';

import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (message === 'SHOW_ALREADY_STARTED') {
      return 'Shows can only be deleted before the start time.';
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

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
      toast.success('Show deleted');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to delete show'));
    },
  });
}
