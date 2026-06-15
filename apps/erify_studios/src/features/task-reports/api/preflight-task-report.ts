import type {
  TaskReportPreflightResponse,
  TaskReportScope,
} from '@eridu/api-types/task-management';

import { withExecutionWindow } from './execution-window';

import { apiClient } from '@/lib/api/client';

export async function preflightTaskReport(
  studioId: string,
  scope: TaskReportScope,
): Promise<TaskReportPreflightResponse> {
  const response = await apiClient.get<TaskReportPreflightResponse>(
    `/studios/${studioId}/task-reports/preflight`,
    { params: withExecutionWindow(scope) },
  );
  return response.data;
}
