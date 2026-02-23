import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { BulkDeleteTasksResponse } from '@eridu/api-types/task-management';

import { bulkDeleteTasks } from '../api/bulk-delete-tasks';

import { showTasksKeys } from '@/features/studio-shows/api/get-show-tasks';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';

type UseDeleteTasksProps = {
  studioId: string;
  showId?: string;
  onSuccess?: () => void;
};

export function useDeleteTasks({ studioId, showId, onSuccess }: UseDeleteTasksProps) {
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteTasksResponse, Error, string[]>({
    mutationFn: (taskUids) => bulkDeleteTasks(studioId, { task_uids: taskUids }),
    onSuccess: (response) => {
      if (showId) {
        queryClient.invalidateQueries({ queryKey: showTasksKeys.list(studioId, showId) });
      } else {
        queryClient.invalidateQueries({ queryKey: showTasksKeys.all });
      }

      queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });

      onSuccess?.();
      toast.success(
        response.deleted_count === 1
          ? '1 task deleted'
          : `${response.deleted_count} tasks deleted`,
      );
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete tasks');
    },
  });
}
