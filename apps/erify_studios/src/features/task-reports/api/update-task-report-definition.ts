import type {
  TaskReportDefinition,
  UpdateTaskReportDefinitionInput,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function updateTaskReportDefinition(
  studioId: string,
  definitionId: string,
  payload: UpdateTaskReportDefinitionInput,
): Promise<TaskReportDefinition> {
  const response = await apiClient.patch<TaskReportDefinition>(
    `/studios/${studioId}/task-report-definitions/${definitionId}`,
    payload,
  );
  return response.data;
}
