import type { BulkDeleteTasksRequest, BulkDeleteTasksResponse } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function bulkDeleteTasks(
  studioId: string,
  data: BulkDeleteTasksRequest,
): Promise<BulkDeleteTasksResponse> {
  const response = await apiClient.delete<BulkDeleteTasksResponse>(
    `/studios/${studioId}/tasks/bulk`,
    { data },
  );
  return response.data;
}
