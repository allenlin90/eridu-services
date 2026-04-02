import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import type { StudioShowDetail, UpdateStudioShowInput } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';

import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export async function updateStudioShow(
  studioId: string,
  showId: string,
  data: UpdateStudioShowInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.patch<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}`,
    data,
  );
  return response.data;
}

export function useUpdateStudioShow(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      showId,
      data,
    }: {
      showId: string;
      data: UpdateStudioShowInput;
    }) => updateStudioShow(studioId, showId, data),
    onSuccess: async (show) => {
      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: [show.id],
      });
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      toast.success('Show updated');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to update show'));
    },
  });
}
