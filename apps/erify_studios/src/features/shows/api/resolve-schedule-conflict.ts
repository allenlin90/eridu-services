import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import type { ResolveScheduleConflictInput, SchedulePublishImpactRow } from '@eridu/api-types/shows';

import { schedulePublishImpactKeys } from './get-schedule-publish-impacts';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export const RESOLVE_CONFLICT_ERROR_MESSAGES: Record<string, string> = {
  CONFLICT_STATE_CHANGED: 'The show has changed since this conflict was opened. Refresh and review the latest data before resolving.',
  CONFLICT_ALREADY_RESOLVED: 'This conflict was already resolved.',
  ACTOR_NOT_FOUND: 'Could not identify the current user. Try signing in again.',
};

export function getResolveConflictErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const message = (error.response?.data as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function isShowNoLongerEligibleError(error: unknown): boolean {
  return getResolveConflictErrorCode(error) === 'SHOW_NO_LONGER_ELIGIBLE';
}

export async function resolveScheduleConflict(
  studioId: string,
  showId: string,
  conflictUid: string,
  data: ResolveScheduleConflictInput,
): Promise<SchedulePublishImpactRow> {
  const response = await apiClient.post<SchedulePublishImpactRow>(
    `/studios/${studioId}/shows/${showId}/schedule-publish-impacts/${conflictUid}/resolve`,
    data,
  );
  return response.data;
}

function replaceRowInCachedLists(queryClient: QueryClient, studioId: string, updatedRow: SchedulePublishImpactRow) {
  queryClient.setQueriesData<PaginatedResponse<SchedulePublishImpactRow>>(
    { queryKey: schedulePublishImpactKeys.listPrefix(studioId) },
    (current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        data: current.data.map((row) => (row.conflict_uid === updatedRow.conflict_uid ? updatedRow : row)),
      };
    },
  );
}

export function useResolveScheduleConflict(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, conflictUid, data }: { showId: string; conflictUid: string; data: ResolveScheduleConflictInput }) =>
      resolveScheduleConflict(studioId, showId, conflictUid, data),
    onSuccess: (updatedRow, variables) => {
      replaceRowInCachedLists(queryClient, studioId, updatedRow);
      toast.success(
        variables.data.action === 'apply'
          ? `Applied — ${updatedRow.show.name} has been updated.`
          : `Dismissed — ${updatedRow.show.name} will keep its current data.`,
      );
    },
    onError: (error) => {
      if (isShowNoLongerEligibleError(error)) {
        toast.error('This show is no longer eligible — it was completed through the normal production flow after this conflict was opened. The conflict has been closed automatically.');
        queryClient.invalidateQueries({ queryKey: schedulePublishImpactKeys.listPrefix(studioId) });
        return;
      }
      toast.error(getMutationErrorMessage(error, 'Failed to resolve conflict', RESOLVE_CONFLICT_ERROR_MESSAGES));
    },
  });
}
