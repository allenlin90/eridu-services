import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReassignTaskShowRequest, TaskDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function reassignAdminTaskShow(taskId: string, data: ReassignTaskShowRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/admin/tasks/${taskId}/reassign-show`, data);
  return response.data;
}

export function useReassignAdminTaskShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: ReassignTaskShowRequest }) =>
      reassignAdminTaskShow(taskId, data),
    onSuccess: (_task, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks', 'detail', taskId] });
    },
  });
}
