import type {
  TaskReportResult,
  TaskReportRunRequest,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function runTaskReport(
  studioId: string,
  payload: TaskReportRunRequest,
): Promise<TaskReportResult> {
  const response = await apiClient.post<TaskReportResult>(
    `/studios/${studioId}/task-reports/run`,
    payload,
  );
  return response.data;
}
