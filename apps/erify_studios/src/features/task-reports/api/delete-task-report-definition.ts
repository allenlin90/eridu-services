import { apiClient } from '@/lib/api/client';

export async function deleteTaskReportDefinition(
  studioId: string,
  definitionId: string,
): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/task-report-definitions/${definitionId}`);
}
