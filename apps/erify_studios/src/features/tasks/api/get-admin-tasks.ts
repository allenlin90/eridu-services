import { keepPreviousData, useQuery } from '@tanstack/react-query';

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
  | 'sort'
  | 'studio_id'
  | 'client_id'
>;

export async function getAdminTasks(params: GetAdminTasksParams): Promise<AdminTasksResponse> {
  const response = await apiClient.get<AdminTasksResponse>('/admin/tasks', { params });
  return response.data;
}

export function useAdminTasksQuery(params: GetAdminTasksParams) {
  return useQuery({
    queryKey: ['admin-tasks', 'list', params],
    queryFn: () => getAdminTasks(params),
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
