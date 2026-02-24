import type { TaskDto, UpdateTaskRequest } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function updateStudioTask(
  studioId: string,
  taskId: string,
  data: UpdateTaskRequest,
): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/studios/${studioId}/tasks/${taskId}`, data);
  return response.data;
}
