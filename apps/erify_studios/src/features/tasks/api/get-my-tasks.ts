import type { ListMyTasksQuery, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type MyTasksResponse = PaginatedResponse<TaskWithRelationsDto>;

export const myTasksKeys = {
  all: ['my-tasks'] as const,
  lists: () => [...myTasksKeys.all, 'list'] as const,
  list: (filters?: any) => [...myTasksKeys.lists(), filters] as const,
};

export async function getMyTasks(query: ListMyTasksQuery): Promise<MyTasksResponse> {
  const { studio_id, status, due_date_from, due_date_to, sort, page = 1, limit = 20 } = query;

  const searchParams = new URLSearchParams();
  if (studio_id)
    searchParams.append('studio_id', studio_id);
  if (status) {
    if (Array.isArray(status)) {
      status.forEach((s) => searchParams.append('status', s));
    } else {
      searchParams.append('status', status as string);
    }
  }
  if (due_date_from)
    searchParams.append('due_date_from', due_date_from);
  if (due_date_to)
    searchParams.append('due_date_to', due_date_to);
  if (sort)
    searchParams.append('sort', sort);
  searchParams.append('page', page.toString());
  searchParams.append('limit', limit.toString());

  const response = await apiClient.get<MyTasksResponse>(`/me/tasks?${searchParams.toString()}`);
  return response.data;
}
