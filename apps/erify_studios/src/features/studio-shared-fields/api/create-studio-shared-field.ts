import type { CreateSharedFieldInput, SharedFieldsResponse } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function createStudioSharedField(
  studioId: string,
  payload: CreateSharedFieldInput,
): Promise<SharedFieldsResponse> {
  const response = await apiClient.post<SharedFieldsResponse>(
    `/studios/${studioId}/settings/shared-fields`,
    payload,
  );
  return response.data;
}
