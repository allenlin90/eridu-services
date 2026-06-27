import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import type {
  AmendCancellationNoteInput,
  CancellationStatusResponse,
  CancelShowWithResolutionInput,
  ResolveShowCancellationInput,
  StudioShowDetail,
} from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';
import { studioShowsKeys } from './get-studio-shows';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

export const cancellationStatusKeys = {
  all: ['studio-show', 'cancellation-status'] as const,
  detail: (studioId: string, showId: string) => [...cancellationStatusKeys.all, studioId, showId] as const,
};

const CANCELLATION_ERROR_MESSAGES: Record<string, string> = {
  SHOW_CANCELLATION_NOT_ALLOWED: 'This show cannot be cancelled from its current status.',
  CANCELLATION_NOT_AUTHORIZED: 'You are not authorized to cancel this show. Only Managers/Admins or the current Duty Manager can.',
  OUTCOME_REQUIRED: 'Choose an outcome before submitting.',
  OUTCOME_NOT_ALLOWED_FOR_DUTY_MANAGER: 'Only a Manager can choose the final outcome.',
  SHOW_CANCELLATION_NOT_PENDING: 'This show is not currently pending resolution.',
  SIGN_OFF_REQUIRES_MANAGER: 'Only a Manager/Admin can sign off a pending resolution.',
  NOTE_AMEND_REQUIRES_DUTY_MANAGER: 'Only the current Duty Manager can update this note.',
};

type GateErrorDetails = { activeTaskCount?: unknown };
type GateErrorBody = { message?: unknown; details?: GateErrorDetails };

export function getGateErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const message = (error.response?.data as GateErrorBody | undefined)?.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }
  return message.split(':')[0] ?? null;
}

export function getGateActiveTaskCount(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const activeTaskCount = (error.response?.data as GateErrorBody | undefined)?.details?.activeTaskCount;
  return typeof activeTaskCount === 'number' ? activeTaskCount : null;
}

function gateMutationErrorMessage(error: unknown, fallback: string): string {
  const code = getGateErrorCode(error);
  if (code && CANCELLATION_ERROR_MESSAGES[code]) {
    return CANCELLATION_ERROR_MESSAGES[code];
  }
  return getMutationErrorMessage(error, fallback, CANCELLATION_ERROR_MESSAGES);
}

export async function cancelShowWithResolution(
  studioId: string,
  showId: string,
  data: CancelShowWithResolutionInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/cancel-with-resolution`,
    data,
  );
  return response.data;
}

export async function resolveShowCancellation(
  studioId: string,
  showId: string,
  data: ResolveShowCancellationInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/resolve-cancellation`,
    data,
  );
  return response.data;
}

export async function amendCancellationNote(
  studioId: string,
  showId: string,
  data: AmendCancellationNoteInput,
): Promise<CancellationStatusResponse> {
  const response = await apiClient.patch<CancellationStatusResponse>(
    `/studios/${studioId}/shows/${showId}/cancellation-note`,
    data,
  );
  return response.data;
}

export async function getCancellationStatus(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<CancellationStatusResponse> {
  const response = await apiClient.get<CancellationStatusResponse>(
    `/studios/${studioId}/shows/${showId}/cancellation-status`,
    { signal: options?.signal },
  );
  return response.data;
}

async function invalidateAfterGateTransition(queryClient: QueryClient, studioId: string, showId: string) {
  await invalidateStudioTaskQueries({ queryClient, studioId, showIds: [showId] });
  queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
  queryClient.invalidateQueries({ queryKey: cancellationStatusKeys.detail(studioId, showId) });
}

export function useCancelShowWithResolution(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: CancelShowWithResolutionInput }) =>
      cancelShowWithResolution(studioId, showId, data),
    onSuccess: async (show) => {
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      await invalidateAfterGateTransition(queryClient, studioId, show.id);
      toast.success('Cancellation submitted');
    },
    onError: (error) => {
      toast.error(gateMutationErrorMessage(error, 'Failed to cancel show'));
    },
  });
}

export function useResolveShowCancellation(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: ResolveShowCancellationInput }) =>
      resolveShowCancellation(studioId, showId, data),
    onSuccess: async (show) => {
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      await invalidateAfterGateTransition(queryClient, studioId, show.id);
      toast.success('Cancellation resolved');
    },
    onError: (error) => {
      toast.error(gateMutationErrorMessage(error, 'Failed to resolve cancellation'));
    },
  });
}

export function useAmendCancellationNote(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: AmendCancellationNoteInput }) =>
      amendCancellationNote(studioId, showId, data),
    onSuccess: async (_status, { showId }) => {
      queryClient.invalidateQueries({ queryKey: cancellationStatusKeys.detail(studioId, showId) });
      toast.success('Note updated');
    },
    onError: (error) => {
      toast.error(gateMutationErrorMessage(error, 'Failed to update note'));
    },
  });
}

export function useCancellationStatus(studioId: string, showId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: cancellationStatusKeys.detail(studioId, showId),
    queryFn: ({ signal }) => getCancellationStatus(studioId, showId, { signal }),
    enabled: options?.enabled ?? true,
  });
}
