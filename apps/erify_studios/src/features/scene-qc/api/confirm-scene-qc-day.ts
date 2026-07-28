import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateSceneQcConfirmationInput, SceneQcConfirmation } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function confirmSceneQcDay(
  studioId: string,
  body: CreateSceneQcConfirmationInput,
): Promise<SceneQcConfirmation> {
  const response = await apiClient.post<SceneQcConfirmation>(`/studios/${studioId}/scene-qc-confirmations`, body);
  return response.data;
}

/**
 * Invalidates EXACTLY the Scene QC families the confirmation can affect
 * (§1.11) -- summary, the day's items (confirmation flips every included
 * review to `is_confirmed`), and Records. Never Task or Show caches.
 * Awaited (not fire-and-forget), matching the pattern
 * `save-scene-qc-review.ts` was corrected to during Child PR 3 review.
 */
function invalidateSceneQcConfirmationQueries(
  queryClient: QueryClient,
  studioId: string,
  operationalDate: string,
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: sceneQcKeys.summary(studioId, operationalDate) }),
    queryClient.invalidateQueries({ queryKey: sceneQcKeys.itemsPrefix(studioId, operationalDate) }),
    queryClient.invalidateQueries({ queryKey: sceneQcKeys.recordsPrefix(studioId) }),
  ]).then(() => undefined);
}

export function useConfirmSceneQcDay(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSceneQcConfirmationInput) => confirmSceneQcDay(studioId, body),
    onSuccess: (_confirmation, variables) =>
      invalidateSceneQcConfirmationQueries(queryClient, studioId, variables.operational_date),
  });
}
