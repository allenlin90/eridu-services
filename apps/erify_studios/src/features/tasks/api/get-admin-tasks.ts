import type {
  ListMyTasksQuery,
  TaskWithRelationsDto,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type AdminTasksResponse = PaginatedResponse<TaskWithRelationsDto>;

export type GetAdminTasksParams = Pick<
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
  | 'studio_name'
  | 'client_name'
  | 'assignee_name'
  | 'show_name'
  | 'search'
  | 'reference_id'
  | 'sort'
  | 'studio_id'
  | 'client_id'
>;

export const adminTasksKeys = {
  all: ['admin-tasks'] as const,
  lists: () => [...adminTasksKeys.all, 'list'] as const,
  list: (params: GetAdminTasksParams) => [...adminTasksKeys.lists(), params] as const,
};

export async function getAdminTasks(params: GetAdminTasksParams): Promise<AdminTasksResponse> {
  const response = await apiClient.get<AdminTasksResponse>('/admin/tasks', { params });
  return response.data;
}
