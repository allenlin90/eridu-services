import type { ReassignTaskRequest, TaskDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function reassignAdminTask(taskId: string, data: ReassignTaskRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/admin/tasks/${taskId}/assign`, data);
  return response.data;
}
