import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CancelStudioShowInput,
  ResolveStudioShowCancellationInput,
  StudioShowDetail,
} from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';
import { studioShowStateGateKeys } from './get-studio-show-state-gate';
import { studioShowsKeys } from './get-studio-shows';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

const CANCELLATION_ERROR_MESSAGES: Record<string, string> = {
  SHOW_CANCELLATION_NOT_ALLOWED: 'This show cannot be cancelled for resolution in its current status.',
  RESOLUTION_OWNER_NOT_FOUND: 'The selected resolution owner could not be found in this studio.',
  SHOW_CANCELLATION_NOT_PENDING: 'This show is not currently pending resolution.',
  GATE_NOT_CLAIMED: 'Claim this gate before resolving it.',
  ACTIVE_TASKS_REMAIN: 'This show still has active tasks. Close or reassign them before confirming cancellation.',
  LIVE_CANCELLATION_REQUIRES_OVERRIDE: 'This show was live when interrupted. Resume it or mark it completed instead of cancelling outright.',
};

export async function cancelStudioShowWithResolution(
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

export async function resolveStudioShowCancellation(
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

async function invalidateAfterGateChange(
  queryClient: QueryClient,
  studioId: string,
  showId: string,
) {
  await invalidateStudioTaskQueries({
    queryClient,
    studioId,
    showIds: [showId],
  });
  await queryClient.invalidateQueries({ queryKey: studioShowKeys.detail(studioId, showId) });
  await queryClient.invalidateQueries({ queryKey: studioShowStateGateKeys.detail(studioId, showId) });
  await queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
}

export function useCancelStudioShowWithResolution(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: CancelStudioShowInput }) =>
      cancelStudioShowWithResolution(studioId, showId, data),
    onSuccess: async (_, { showId }) => {
      await invalidateAfterGateChange(queryClient, studioId, showId);
      toast.success('Show moved to pending resolution');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to cancel show', CANCELLATION_ERROR_MESSAGES));
    },
  });
}

export function useResolveStudioShowCancellation(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: ResolveStudioShowCancellationInput }) =>
      resolveStudioShowCancellation(studioId, showId, data),
    onSuccess: async (_, { showId }) => {
      await invalidateAfterGateChange(queryClient, studioId, showId);
      toast.success('Cancellation resolved');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to resolve cancellation', CANCELLATION_ERROR_MESSAGES));
    },
  });
}
