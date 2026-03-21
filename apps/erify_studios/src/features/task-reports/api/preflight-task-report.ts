import type {
  TaskReportPreflightResponse,
  TaskReportScope,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function preflightTaskReport(
  studioId: string,
  scope: TaskReportScope,
): Promise<TaskReportPreflightResponse> {
  const response = await apiClient.get<TaskReportPreflightResponse>(
    `/studios/${studioId}/task-reports/preflight`,
    { params: scope },
  );
  return response.data;
}
