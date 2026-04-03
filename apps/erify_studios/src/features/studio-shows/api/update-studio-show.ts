import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { StudioShowDetail, UpdateStudioShowInput } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

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
