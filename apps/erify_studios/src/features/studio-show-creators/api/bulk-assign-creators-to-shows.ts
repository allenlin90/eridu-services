import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import type {
  BulkAssignStudioShowCreatorsResponse,
  BulkShowCreatorAssignmentInput,
  BulkShowCreatorAssignmentResponse,
} from '@eridu/api-types/studio-creators';

import { showCreatorsKeys } from './get-show-creators';

import { studioShowKeys } from '@/features/studio-shows/api/get-studio-show';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { apiClient } from '@/lib/api/client';

type UseBulkAssignCreatorsToShowsProps = {
  studioId: string;
  onSuccess?: () => void;
};

type StudioShowCreatorAssignmentInput = {
  creators: Array<{
    creator_id: string;
  }>;
};

async function assignCreatorsToSingleShow(
  studioId: string,
  showId: string,
  data: StudioShowCreatorAssignmentInput,
): Promise<BulkAssignStudioShowCreatorsResponse> {
  const response = await apiClient.post<BulkAssignStudioShowCreatorsResponse>(
    `/studios/${studioId}/shows/${showId}/creators/bulk-assign`,
    data,
  );
  return response.data;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Request failed';
}

async function bulkAssignCreatorsToShows(
  studioId: string,
  payload: BulkShowCreatorAssignmentInput,
): Promise<BulkShowCreatorAssignmentResponse> {
  const showIds = [...new Set(payload.show_ids)];
  const creatorIds = [...new Set(payload.creator_ids)];
  const creators = creatorIds.map((creatorId) => ({ creator_id: creatorId }));

  // TODO(phase5/query-optimization): add concurrency cap (e.g. p-limit with concurrency=5)
  // to prevent abuse when many shows are selected simultaneously.
  const settledResults = await Promise.all(
    showIds.map(async (showId) => {
      try {
        const result = await assignCreatorsToSingleShow(studioId, showId, { creators });
        return {
          showId,
          result,
        };
      } catch (error) {
        return {
          showId,
          error: resolveErrorMessage(error),
        };
      }
    }),
  );

  const summary: BulkShowCreatorAssignmentResponse = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  settledResults.forEach((item) => {
    if ('result' in item) {
      summary.created += item.result.assigned;
      summary.skipped += item.result.skipped;
      summary.errors.push(
        ...item.result.failed.map((failure) => ({
          show_id: item.showId,
          creator_id: failure.creator_id,
          reason: failure.reason,
        })),
      );
      return;
    }

    summary.errors.push(
      ...creatorIds.map((creatorId) => ({
        show_id: item.showId,
        creator_id: creatorId,
        reason: item.error,
      })),
    );
  });

  return summary;
}

export function useBulkAssignCreatorsToShows({
  studioId,
  onSuccess,
}: UseBulkAssignCreatorsToShowsProps) {
  const queryClient = useQueryClient();

  return useMutation<BulkShowCreatorAssignmentResponse, Error, BulkShowCreatorAssignmentInput>({
    mutationFn: (payload) => bulkAssignCreatorsToShows(studioId, payload),
    meta: {
      errorMessage: 'Failed to assign creators to selected shows',
    },
    onSuccess: async (response, variables) => {
      const uniqueShowIds = [...new Set(variables.show_ids)];
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) }),
        ...uniqueShowIds.map((showId) => queryClient.invalidateQueries({ queryKey: studioShowKeys.detail(studioId, showId) })),
        ...uniqueShowIds.map((showId) => queryClient.invalidateQueries({ queryKey: showCreatorsKeys.list(studioId, showId) })),
      ]);

      if (response.created === 0 && response.errors.length === 0) {
        if (response.skipped > 0) {
          toast.info(`No new assignments. ${response.skipped} assignment(s) already existed.`);
        } else {
          toast.warning('No creator assignments were created.');
        }
      } else if (response.errors.length > 0) {
        toast.warning(
          `Assigned ${response.created}, skipped ${response.skipped}, with ${response.errors.length} error(s).`,
        );
      } else {
        toast.success(`Assigned ${response.created} creator-show pair(s).`);
      }

      onSuccess?.();
    },
  });
}
