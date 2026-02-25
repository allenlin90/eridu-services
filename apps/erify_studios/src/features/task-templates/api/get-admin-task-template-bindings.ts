import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type {
  AdminTaskTemplateBindingDto,
  ListAdminTaskTemplateBindingsQuery,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type AdminTaskTemplateBindingsResponse = PaginatedResponse<AdminTaskTemplateBindingDto>;

export type GetAdminTaskTemplateBindingsParams = Pick<
  ListAdminTaskTemplateBindingsQuery,
  | 'page'
  | 'limit'
  | 'status'
  | 'show_start_from'
  | 'show_start_to'
  | 'include_deleted'
>;

export async function getAdminTaskTemplateBindings(
  templateId: string,
  params: GetAdminTaskTemplateBindingsParams,
): Promise<AdminTaskTemplateBindingsResponse> {
  const response = await apiClient.get<AdminTaskTemplateBindingsResponse>(
    `/admin/task-templates/${templateId}/bindings`,
    { params },
  );
  return response.data;
}

export function useAdminTaskTemplateBindingsQuery(
  templateId: string | null,
  params: GetAdminTaskTemplateBindingsParams,
) {
  return useQuery({
    queryKey: ['admin-task-templates', 'bindings', templateId, params],
    queryFn: () => getAdminTaskTemplateBindings(templateId!, params),
    enabled: Boolean(templateId),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
