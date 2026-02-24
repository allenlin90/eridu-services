import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskActionRequest, TaskDto } from '@eridu/api-types/task-management';

import { updateStudioTaskStatus } from '../api/update-studio-task-status';

import {
  invalidateStudioTaskQueries,
  refetchStudioShowListsContainingShow,
} from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { myTasksKeys } from '@/features/tasks/api/get-my-tasks';

type UseUpdateStudioTaskStatusProps = {
  studioId: string;
  showId: string;
};

export function useUpdateStudioTaskStatus({ studioId, showId }: UseUpdateStudioTaskStatusProps) {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; data: TaskActionRequest }>({
    mutationFn: ({ taskId, data }) => updateStudioTaskStatus(studioId, taskId, data),
    onSuccess: async () => {
      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: [showId],
      });

      await refetchStudioShowListsContainingShow({
        queryClient,
        studioId,
        showId,
      });

      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });

      toast.success('Task status updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task status');
    },
  });
}
