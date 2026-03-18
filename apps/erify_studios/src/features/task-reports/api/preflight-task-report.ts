import type {
  TaskReportPreflightRequest,
  TaskReportPreflightResponse,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function preflightTaskReport(
  studioId: string,
  payload: TaskReportPreflightRequest,
): Promise<TaskReportPreflightResponse> {
  const response = await apiClient.post<TaskReportPreflightResponse>(
    `/studios/${studioId}/task-reports/preflight`,
    payload,
  );
  return response.data;
}
