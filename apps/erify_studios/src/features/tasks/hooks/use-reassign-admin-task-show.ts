import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReassignTaskShowRequest } from '@eridu/api-types/task-management';

import { adminTasksKeys } from '../api/get-admin-tasks';
import { reassignAdminTaskShow } from '../api/reassign-admin-task-show';

export function useReassignAdminTaskShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: ReassignTaskShowRequest }) =>
      reassignAdminTaskShow(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTasksKeys.all });
    },
  });
}
