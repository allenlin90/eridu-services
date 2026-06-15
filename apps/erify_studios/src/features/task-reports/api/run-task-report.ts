import type {
  TaskReportResult,
  TaskReportRunRequest,
  TaskReportScope,
} from '@eridu/api-types/task-management';

import { withExecutionWindow } from './execution-window';

import { apiClient } from '@/lib/api/client';

/**
 * FE-facing run input: callers pass the plain scope (calendar dates); the
 * operational-day window is attached here before hitting the wire.
 */
export type RunTaskReportInput = Omit<TaskReportRunRequest, 'scope'> & {
  scope: TaskReportScope;
};

export async function runTaskReport(
  studioId: string,
  payload: RunTaskReportInput,
): Promise<TaskReportResult> {
  const body: TaskReportRunRequest = {
    ...payload,
    scope: withExecutionWindow(payload.scope),
  };

  const response = await apiClient.post<TaskReportResult>(
    `/studios/${studioId}/task-reports/run`,
    body,
  );
  return response.data;
}
