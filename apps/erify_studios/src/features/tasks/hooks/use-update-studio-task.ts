import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskDto, UpdateTaskRequest } from '@eridu/api-types/task-management';

import {
  invalidateStudioTaskQueries,
  refetchStudioShowListsContainingShow,
} from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { myTasksKeys } from '@/features/tasks/api/get-my-tasks';
import { studioTasksKeys } from '@/features/tasks/api/get-studio-tasks';
import { updateStudioTask } from '@/features/tasks/api/update-studio-task';

type UseUpdateStudioTaskProps = {
  studioId: string;
  showId?: string;
};

export function useUpdateStudioTask({ studioId, showId }: UseUpdateStudioTaskProps) {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; data: UpdateTaskRequest }>({
    mutationFn: ({ taskId, data }) => updateStudioTask(studioId, taskId, data),
    onSuccess: async () => {
      if (showId) {
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
      }

      queryClient.invalidateQueries({ queryKey: studioTasksKeys.all(studioId) });
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });

      toast.success('Task updated');
    },
  });
}
