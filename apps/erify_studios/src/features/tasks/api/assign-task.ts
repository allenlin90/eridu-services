import type { ReassignTaskRequest, TaskDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function assignTask(studioId: string, taskId: string, data: ReassignTaskRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(
    `/studios/${studioId}/tasks/${taskId}/assign`,
    data,
  );
  return response.data;
}
