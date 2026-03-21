import type {
  ListTaskReportDefinitionsQuery,
  TaskReportDefinition,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type TaskReportDefinitionsResponse = PaginatedResponse<TaskReportDefinition>;

export async function getTaskReportDefinitions(
  studioId: string,
  params: ListTaskReportDefinitionsQuery,
  options?: { signal?: AbortSignal },
): Promise<TaskReportDefinitionsResponse> {
  const response = await apiClient.get<TaskReportDefinitionsResponse>(
    `/studios/${studioId}/task-report-definitions`,
    { params, signal: options?.signal },
  );
  return response.data;
}
