import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateSceneQcReviewInput, SceneQcReview, UpdateSceneQcReviewInput } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function createSceneQcReview(
  studioId: string,
  body: CreateSceneQcReviewInput,
): Promise<SceneQcReview> {
  const response = await apiClient.post<SceneQcReview>(`/studios/${studioId}/scene-qc-reviews`, body);
  return response.data;
}

export async function updateSceneQcReview(
  studioId: string,
  reviewId: string,
  body: UpdateSceneQcReviewInput,
): Promise<SceneQcReview> {
  const response = await apiClient.patch<SceneQcReview>(`/studios/${studioId}/scene-qc-reviews/${reviewId}`, body);
  return response.data;
}

/**
 * Invalidates EXACTLY the Scene QC daily key families for the review's
 * pinned Show/date -- never Task or Show caches (§8.4). Shared by both
 * mutations below so their invalidation scope stays identical.
 */
function invalidateSceneQcDailyQueries(queryClient: QueryClient, studioId: string, review: SceneQcReview): void {
  void queryClient.invalidateQueries({ queryKey: sceneQcKeys.summary(studioId, review.operational_date) });
  void queryClient.invalidateQueries({ queryKey: sceneQcKeys.itemsPrefix(studioId, review.operational_date) });
  void queryClient.invalidateQueries({
    queryKey: sceneQcKeys.itemDetail(studioId, review.operational_date, review.show_id),
  });
}

export function useCreateSceneQcReview(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSceneQcReviewInput) => createSceneQcReview(studioId, body),
    onSuccess: (review) => invalidateSceneQcDailyQueries(queryClient, studioId, review),
  });
}

export function useUpdateSceneQcReview(studioId: string, reviewId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSceneQcReviewInput) => {
      if (!reviewId) {
        return Promise.reject(new Error('reviewId is required'));
      }
      return updateSceneQcReview(studioId, reviewId, body);
    },
    onSuccess: (review) => invalidateSceneQcDailyQueries(queryClient, studioId, review),
  });
}
