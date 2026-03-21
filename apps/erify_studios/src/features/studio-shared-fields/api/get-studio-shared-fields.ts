import type { SharedFieldsResponse } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function getStudioSharedFields(
  studioId: string,
  options?: { signal?: AbortSignal },
): Promise<SharedFieldsResponse> {
  const response = await apiClient.get<SharedFieldsResponse>(
    `/studios/${studioId}/settings/shared-fields`,
    { signal: options?.signal },
  );
  return response.data;
}
