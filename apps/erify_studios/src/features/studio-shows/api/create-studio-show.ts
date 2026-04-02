import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import type { CreateStudioShowInput, StudioShowDetail } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';

import { showLookupsKeys } from '@/features/shows/api/get-show-lookups';
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

export async function createStudioShow(
  studioId: string,
  data: CreateStudioShowInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(`/studios/${studioId}/shows`, data);
  return response.data;
}

export function useCreateStudioShow(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudioShowInput) => createStudioShow(studioId, data),
    onSuccess: async (show) => {
      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: [show.id],
      });
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      queryClient.invalidateQueries({ queryKey: showLookupsKeys.detail(studioId) });
      toast.success('Show created');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to create show'));
    },
  });
}
