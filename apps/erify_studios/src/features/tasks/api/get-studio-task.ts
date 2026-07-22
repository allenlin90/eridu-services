import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export const studioTaskKeys = {
  all: ['studio-task'] as const,
  detail: (studioId: string, taskId: string) => [...studioTaskKeys.all, 'detail', studioId, taskId] as const,
};

export async function getStudioTask(
  studioId: string,
  taskId: string,
  options?: { signal?: AbortSignal },
): Promise<TaskWithRelationsDto> {
  const response = await apiClient.get<TaskWithRelationsDto>(`/studios/${studioId}/tasks/${taskId}`, {
    signal: options?.signal,
  });
  return response.data;
}
