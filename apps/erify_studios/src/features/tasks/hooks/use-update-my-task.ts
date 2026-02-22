import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskDto, UpdateTaskRequest } from '@eridu/api-types/task-management';

import { myTasksKeys } from '../api/get-my-tasks';
import { updateMyTask } from '../api/update-my-task';

import { showTasksKeys } from '@/features/studio-shows/api/get-show-tasks';

export function useUpdateMyTask() {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; data: UpdateTaskRequest }>({
    mutationFn: ({ taskId, data }) => updateMyTask(taskId, data),
    onMutate: async ({ taskId: _taskId, data: _data }) => {
      // Optimistic update implementation can be expanded here if needed
      await queryClient.cancelQueries({ queryKey: myTasksKeys.all });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
      // Depending on other views, we might also want to invalidate show tasks here
      queryClient.invalidateQueries({ queryKey: showTasksKeys.all });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}
