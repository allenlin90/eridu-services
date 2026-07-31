import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreateSceneQcReviewAmendmentInput,
  SceneQcReviewAmendment,
} from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export function useAppendSceneQcAmendment(studioId: string, reviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSceneQcReviewAmendmentInput) => {
      const response = await apiClient.post<SceneQcReviewAmendment>(
        `/studios/${studioId}/scene-qc-reviews/${reviewId}/amendments`,
        body,
      );
      return response.data;
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: sceneQcKeys.recordDetail(studioId, reviewId) }),
      queryClient.invalidateQueries({ queryKey: sceneQcKeys.recordsPrefix(studioId) }),
      queryClient.invalidateQueries({ queryKey: sceneQcKeys.reportPrefix(studioId) }),
    ]),
  });
}
