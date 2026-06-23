import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CancelStudioShowInput,
  ResolveStudioShowCancellationInput,
  StudioShowDetail,
} from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';
import { studioShowsKeys } from './get-studio-shows';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

async function cancelStudioShowWithResolution(
  studioId: string,
  showId: string,
  data: CancelStudioShowInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/cancel-with-resolution`,
    data,
  );
  return response.data;
}

async function resolveStudioShowCancellation(
  studioId: string,
  showId: string,
  data: ResolveStudioShowCancellationInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/resolve-cancellation`,
    data,
  );
  return response.data;
}

function useShowLifecycleMutationSuccess(studioId: string, successMessage: string) {
  const queryClient = useQueryClient();
  return async (show: StudioShowDetail) => {
    await invalidateStudioTaskQueries({
      queryClient,
      studioId,
      showIds: [show.id],
    });
    queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
    queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
    toast.success(successMessage);
  };
}

export function useCancelStudioShowWithResolution(studioId: string) {
  const onSuccess = useShowLifecycleMutationSuccess(studioId, 'Show moved to pending resolution');
  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: CancelStudioShowInput }) =>
      cancelStudioShowWithResolution(studioId, showId, data),
    onSuccess,
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to cancel show'));
    },
  });
}

export function useResolveStudioShowCancellation(studioId: string) {
  const onSuccess = useShowLifecycleMutationSuccess(studioId, 'Show cancellation resolved');
  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: ResolveStudioShowCancellationInput }) =>
      resolveStudioShowCancellation(studioId, showId, data),
    onSuccess,
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to resolve cancellation'));
    },
  });
}
