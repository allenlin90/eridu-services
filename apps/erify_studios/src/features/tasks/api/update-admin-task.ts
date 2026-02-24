import type { TaskDto, UpdateTaskRequest } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function updateAdminTask(taskId: string, data: UpdateTaskRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/admin/tasks/${taskId}`, data);
  return response.data;
}
