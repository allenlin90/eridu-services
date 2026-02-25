import type { AssignShowsRequest, AssignShowsResponse } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function assignShows(studioId: string, data: AssignShowsRequest): Promise<AssignShowsResponse> {
  const response = await apiClient.post<AssignShowsResponse>(
    `/studios/${studioId}/tasks/assign-shows`,
    data,
  );
  return response.data;
}
