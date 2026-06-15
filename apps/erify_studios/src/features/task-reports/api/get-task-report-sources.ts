import type {
  TaskReportScope,
  TaskReportSourcesResponse,
} from '@eridu/api-types/task-management';

import { withExecutionWindow } from './execution-window';

import { apiClient } from '@/lib/api/client';

export async function getTaskReportSources(
  studioId: string,
  scope: TaskReportScope,
  options?: { signal?: AbortSignal },
): Promise<TaskReportSourcesResponse> {
  const response = await apiClient.get<TaskReportSourcesResponse>(
    `/studios/${studioId}/task-report-sources`,
    { params: withExecutionWindow(scope), signal: options?.signal },
  );
  return response.data;
}
