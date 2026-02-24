import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReassignTaskRequest } from '@eridu/api-types/task-management';

import { adminTasksKeys } from '../api/get-admin-tasks';
import { reassignAdminTask } from '../api/reassign-admin-task';

export function useReassignAdminTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: ReassignTaskRequest }) =>
      reassignAdminTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTasksKeys.all });
    },
  });
}
