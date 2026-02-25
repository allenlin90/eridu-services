import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { BulkDeleteTasksResponse } from '@eridu/api-types/task-management';

import { bulkDeleteTasks } from '../api/bulk-delete-tasks';

import {
  invalidateStudioTaskQueries,
  refetchStudioShowListsContainingShow,
} from '@/features/studio-shows/lib/invalidate-studio-task-queries';

type UseDeleteTasksProps = {
  studioId: string;
  showId?: string;
  onSuccess?: () => void;
};

export function useDeleteTasks({ studioId, showId, onSuccess }: UseDeleteTasksProps) {
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteTasksResponse, Error, string[]>({
    mutationFn: (taskUids) => bulkDeleteTasks(studioId, { task_uids: taskUids }),
    onSuccess: async (response) => {
      onSuccess?.();
      toast.success(
        response.deleted_count === 1
          ? '1 task deleted'
          : `${response.deleted_count} tasks deleted`,
      );

      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: showId ? [showId] : [],
      });

      if (showId) {
        await refetchStudioShowListsContainingShow({
          queryClient,
          studioId,
          showId,
        });
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete tasks');
    },
  });
}
