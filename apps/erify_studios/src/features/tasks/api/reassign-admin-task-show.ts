import type { ReassignTaskShowRequest, TaskDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function reassignAdminTaskShow(taskId: string, data: ReassignTaskShowRequest): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/admin/tasks/${taskId}/reassign-show`, data);
  return response.data;
}
