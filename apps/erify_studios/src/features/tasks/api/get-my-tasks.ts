import type { ListMyTasksQuery, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type MyTasksResponse = PaginatedResponse<TaskWithRelationsDto>;

export const myTasksKeys = {
  all: ['my-tasks'] as const,
  lists: () => [...myTasksKeys.all, 'list'] as const,
  list: (filters?: ListMyTasksQuery) => [...myTasksKeys.lists(), filters] as const,
};

export async function getMyTasks(
  query: ListMyTasksQuery,
  options?: { signal?: AbortSignal },
): Promise<MyTasksResponse> {
  const {
    studio_id,
    status,
    task_type,
    due_date_from,
    due_date_to,
    show_start_from,
    show_start_to,
    search,
    sort,
    page,
    limit,
  } = query;
  const pageNumber = Number(page ?? 1);
  const limitNumber = Number(limit ?? 20);

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
  if (task_type) {
    if (Array.isArray(task_type)) {
      task_type.forEach((taskType) => searchParams.append('task_type', taskType));
    } else {
      searchParams.append('task_type', task_type as string);
    }
  }
  if (due_date_from)
    searchParams.append('due_date_from', due_date_from);
  if (due_date_to)
    searchParams.append('due_date_to', due_date_to);
  if (show_start_from)
    searchParams.append('show_start_from', show_start_from);
  if (show_start_to)
    searchParams.append('show_start_to', show_start_to);
  if (search)
    searchParams.append('search', search);
  if (sort)
    searchParams.append('sort', sort);
  searchParams.append('page', pageNumber.toString());
  searchParams.append('limit', limitNumber.toString());

  const response = await apiClient.get<MyTasksResponse>(`/me/tasks?${searchParams.toString()}`, {
    signal: options?.signal,
  });
  return response.data;
}
