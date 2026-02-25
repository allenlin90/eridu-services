import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export const showTasksKeys = {
  all: ['show-tasks'] as const,
  lists: () => [...showTasksKeys.all, 'list'] as const,
  list: (studioId: string, showId: string) => [...showTasksKeys.lists(), studioId, showId] as const,
};

export async function getShowTasks(studioId: string, showId: string): Promise<TaskWithRelationsDto[]> {
  const response = await apiClient.get<TaskWithRelationsDto[]>(`/studios/${studioId}/shows/${showId}/tasks`);
  return response.data;
}
