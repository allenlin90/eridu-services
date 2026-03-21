import type { SharedFieldsResponse, UpdateSharedFieldInput } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export async function updateStudioSharedField(
  studioId: string,
  fieldKey: string,
  payload: UpdateSharedFieldInput,
): Promise<SharedFieldsResponse> {
  const response = await apiClient.patch<SharedFieldsResponse>(
    `/studios/${studioId}/settings/shared-fields/${fieldKey}`,
    payload,
  );
  return response.data;
}
