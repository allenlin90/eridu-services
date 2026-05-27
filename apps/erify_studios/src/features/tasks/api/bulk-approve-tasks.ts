import type { BulkApproveTasksRequest, BulkApproveTasksResponse } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function bulkApproveTasks(
  studioId: string,
  data: BulkApproveTasksRequest,
): Promise<BulkApproveTasksResponse> {
  const response = await apiClient.post<BulkApproveTasksResponse>(
    `/studios/${studioId}/tasks/bulk-approve`,
    data,
  );
  return response.data;
}
