import type { TaskReportDefinition } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function getTaskReportDefinition(
  studioId: string,
  definitionId: string,
  options?: { signal?: AbortSignal },
): Promise<TaskReportDefinition> {
  const response = await apiClient.get<TaskReportDefinition>(
    `/studios/${studioId}/task-report-definitions/${definitionId}`,
    { signal: options?.signal },
  );
  return response.data;
}
