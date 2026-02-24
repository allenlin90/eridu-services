import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReassignTaskRequest, TaskDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function reassignAdminTask(taskId: string, data: ReassignTaskRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/admin/tasks/${taskId}/assign`, data);
  return response.data;
}

export function useReassignAdminTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: ReassignTaskRequest }) =>
      reassignAdminTask(taskId, data),
    onSuccess: (_task, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks', 'detail', taskId] });
    },
  });
}
