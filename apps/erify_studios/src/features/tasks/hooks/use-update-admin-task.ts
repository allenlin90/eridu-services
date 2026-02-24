import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskDto, UpdateTaskRequest } from '@eridu/api-types/task-management';

import { adminTasksKeys } from '@/features/tasks/api/get-admin-tasks';
import { updateAdminTask } from '@/features/tasks/api/update-admin-task';

export function useUpdateAdminTask() {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; data: UpdateTaskRequest }>({
    mutationFn: ({ taskId, data }) => updateAdminTask(taskId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminTasksKeys.all });
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}
