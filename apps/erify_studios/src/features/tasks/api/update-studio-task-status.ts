import type { TaskActionRequest, TaskDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function updateStudioTaskStatus(
  studioId: string,
  taskId: string,
  data: TaskActionRequest,
): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(
    `/studios/${studioId}/tasks/${taskId}/action`,
    data,
  );
  return response.data;
}
