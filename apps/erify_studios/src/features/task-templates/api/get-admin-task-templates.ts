import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type {
  AdminTaskTemplateDto,
  ListAdminTaskTemplatesQuery,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type AdminTaskTemplatesResponse = PaginatedResponse<AdminTaskTemplateDto>;

export type GetAdminTaskTemplatesParams = Pick<
  ListAdminTaskTemplatesQuery,
  | 'page'
  | 'limit'
  | 'search'
  | 'studio_id'
  | 'studio_name'
  | 'task_type'
  | 'is_active'
  | 'include_deleted'
  | 'sort'
>;

export async function getAdminTaskTemplates(
  params: GetAdminTaskTemplatesParams,
): Promise<AdminTaskTemplatesResponse> {
  const response = await apiClient.get<AdminTaskTemplatesResponse>('/admin/task-templates', { params });
  return response.data;
}

export function useAdminTaskTemplatesQuery(params: GetAdminTaskTemplatesParams) {
  return useQuery({
    queryKey: ['admin-task-templates', 'list', params],
    queryFn: () => getAdminTaskTemplates(params),
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
