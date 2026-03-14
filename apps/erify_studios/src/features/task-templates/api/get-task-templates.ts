import type {
  ListTaskTemplatesQuery,
  TaskTemplateDto,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type GetTaskTemplatesResponse = PaginatedResponse<TaskTemplateDto>;

type GetTaskTemplatesOptions = {
  signal?: AbortSignal;
};

export async function getTaskTemplates(
  studioId: string,
  query: ListTaskTemplatesQuery & { page?: number; limit?: number },
  options?: GetTaskTemplatesOptions,
): Promise<GetTaskTemplatesResponse> {
  const response = await apiClient.get<GetTaskTemplatesResponse>(
    `/studios/${studioId}/task-templates`,
    {
      params: {
        page: query.page,
        limit: query.limit,
        name: query.name,
        sort: query.sort,
        // Map other query params if needed
      },
      signal: options?.signal,
    },
  );
  return response.data;
}
