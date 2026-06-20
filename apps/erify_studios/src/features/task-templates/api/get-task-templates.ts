import type {
  ListTaskTemplatesQuery,
  TaskTemplateDto,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type GetTaskTemplatesResponse = PaginatedResponse<TaskTemplateDto>;

export type GetTaskTemplatesParams = Pick<
  ListTaskTemplatesQuery,
  | 'page'
  | 'limit'
  | 'name'
  | 'task_type'
  | 'template_kind'
  | 'is_active'
  | 'sort'
  | 'client_id'
>;

type GetTaskTemplatesOptions = {
  signal?: AbortSignal;
};

export async function getTaskTemplates(
  studioId: string,
  query: GetTaskTemplatesParams,
  options?: GetTaskTemplatesOptions,
): Promise<GetTaskTemplatesResponse> {
  const response = await apiClient.get<GetTaskTemplatesResponse>(
    `/studios/${studioId}/task-templates`,
    {
      params: {
        page: query.page,
        limit: query.limit,
        name: query.name,
        task_type: query.task_type,
        template_kind: query.template_kind,
        is_active: query.is_active,
        sort: query.sort,
        client_id: query.client_id,
      },
      signal: options?.signal,
    },
  );
  return response.data;
}
