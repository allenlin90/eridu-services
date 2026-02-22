import type { TaskDto, UpdateTaskRequest } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function updateMyTask(taskId: string, data: UpdateTaskRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/me/tasks/${taskId}`, data);
  return response.data;
}
