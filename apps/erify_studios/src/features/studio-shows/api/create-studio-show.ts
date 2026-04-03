import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CreateStudioShowInput, StudioShowDetail } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';

import { showLookupsKeys } from '@/features/shows/api/get-show-lookups';
import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

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
