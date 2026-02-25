import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { AssignShowsRequest, AssignShowsResponse } from '@eridu/api-types/task-management';

import { assignShows } from '../api/assign-shows';
import { invalidateStudioTaskQueries } from '../lib/invalidate-studio-task-queries';

type UseAssignShowsProps = {
  studioId: string;
  onSuccess?: () => void;
};

export function useAssignShows({ studioId, onSuccess }: UseAssignShowsProps) {
  const queryClient = useQueryClient();

  return useMutation<AssignShowsResponse, Error, AssignShowsRequest>({
    mutationFn: (data) => assignShows(studioId, data),
    onSuccess: async (response, variables) => {
      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: variables.show_uids,
      });

      if (response.updated_count === 0) {
        toast.warning(
          response.shows_without_tasks.length > 0
            ? `No tasks were assigned. ${response.shows_without_tasks.length} selected show(s) have no generated tasks yet.`
            : 'No tasks were assigned.',
        );
      } else {
        const skippedPart = response.shows_without_tasks.length > 0
          ? ` (${response.shows_without_tasks.length} show(s) had no tasks)`
          : '';
        toast.success(
          `Assigned ${response.updated_count} task(s) to ${response.assignee.name}${skippedPart}`,
        );
      }

      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign tasks');
    },
  });
}
