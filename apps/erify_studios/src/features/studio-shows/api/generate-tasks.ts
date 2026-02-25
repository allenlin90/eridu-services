import type { GenerateTasksRequest, GenerateTasksResponse } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function generateTasks(studioId: string, data: GenerateTasksRequest): Promise<GenerateTasksResponse> {
  const response = await apiClient.post<GenerateTasksResponse>(
    `/studios/${studioId}/tasks/generate`,
    data,
  );
  return response.data;
}
