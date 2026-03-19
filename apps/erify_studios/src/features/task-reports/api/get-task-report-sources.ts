import type {
  GetTaskReportSourcesQuery,
  TaskReportSourcesResponse,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function getTaskReportSources(
  studioId: string,
  params: GetTaskReportSourcesQuery,
  options?: { signal?: AbortSignal },
): Promise<TaskReportSourcesResponse> {
  const response = await apiClient.get<TaskReportSourcesResponse>(
    `/studios/${studioId}/task-report-sources`,
    { params, signal: options?.signal },
  );
  return response.data;
}
