import type {
  ListMyTasksQuery,
  TaskWithRelationsDto,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type StudioTasksResponse = PaginatedResponse<TaskWithRelationsDto>;

export type GetStudioTasksParams = Pick<
  ListMyTasksQuery,
  | 'page'
  | 'limit'
  | 'status'
  | 'task_type'
  | 'has_assignee'
  | 'has_due_date'
  | 'due_date_from'
  | 'due_date_to'
  | 'show_start_from'
  | 'show_start_to'
  | 'client_name'
  | 'assignee_name'
  | 'show_name'
  | 'search'
  | 'sort'
  | 'client_id'
>;

export const studioTasksKeys = {
  all: (studioId: string) => ['studio-tasks', studioId] as const,
  lists: (studioId: string) => [...studioTasksKeys.all(studioId), 'list'] as const,
  list: (studioId: string, params: GetStudioTasksParams) =>
    [...studioTasksKeys.lists(studioId), params] as const,
};

export async function getStudioTasks(
  studioId: string,
  params: GetStudioTasksParams,
): Promise<StudioTasksResponse> {
  const response = await apiClient.get<StudioTasksResponse>(`/studios/${studioId}/tasks`, { params });
  return response.data;
}
