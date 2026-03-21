import type {
  CreateTaskReportDefinitionInput,
  TaskReportDefinition,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function createTaskReportDefinition(
  studioId: string,
  payload: CreateTaskReportDefinitionInput,
): Promise<TaskReportDefinition> {
  const response = await apiClient.post<TaskReportDefinition>(
    `/studios/${studioId}/task-report-definitions`,
    payload,
  );
  return response.data;
}
