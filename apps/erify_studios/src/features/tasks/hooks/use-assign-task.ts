import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskDto } from '@eridu/api-types/task-management';

import { assignTask } from '../api/assign-task';

import { showTasksKeys } from '@/features/studio-shows/api/get-show-tasks';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';

type UseAssignTaskProps = {
  studioId: string;
  showId?: string; // Optional: used for targeted cache invalidation
};

export function useAssignTask({ studioId, showId }: UseAssignTaskProps) {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; assigneeUid: string | null }>({
    mutationFn: ({ taskId, assigneeUid }) =>
      assignTask(studioId, taskId, { assignee_uid: assigneeUid }),
    onSuccess: () => {
      // Invalidate the tasks list for this show
      if (showId) {
        queryClient.invalidateQueries({ queryKey: showTasksKeys.list(studioId, showId) });
      } else {
        // Fallback invalidate everything if showId isn't provided (e.g from "My Tasks")
        queryClient.invalidateQueries({ queryKey: showTasksKeys.all });
      }

      // Also invalidate the studio shows summary list
      queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });

      toast.success('Task assignee updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task assignee');
    },
  });
}
