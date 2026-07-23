import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type {
  SceneReviewDetail,
  SceneReviewListItem,
  SceneReviewMode,
} from '@eridu/api-types/task-management';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type SceneReviewListParams = {
  mode: SceneReviewMode;
  show_start_from: string;
  show_start_to: string;
  client_id?: string;
  platform_id?: string;
  search?: string;
  page: number;
  limit: number;
};

export type SceneReviewListResponse = PaginatedResponse<SceneReviewListItem>;

export const sceneReviewKeys = {
  all: (studioId: string) => ['scene-review', studioId] as const,
  lists: (studioId: string) => [...sceneReviewKeys.all(studioId), 'list'] as const,
  list: (studioId: string, params: SceneReviewListParams) =>
    [...sceneReviewKeys.lists(studioId), params] as const,
  details: (studioId: string) => [...sceneReviewKeys.all(studioId), 'detail'] as const,
  detail: (studioId: string, taskId: string) =>
    [...sceneReviewKeys.details(studioId), taskId] as const,
};

export async function getSceneReview(
  studioId: string,
  params: SceneReviewListParams,
  options?: { signal?: AbortSignal },
): Promise<SceneReviewListResponse> {
  const response = await apiClient.get<SceneReviewListResponse>(
    `/studios/${studioId}/scene-review`,
    { params, signal: options?.signal },
  );
  return response.data;
}

export async function getSceneReviewDetail(
  studioId: string,
  taskId: string,
  options?: { signal?: AbortSignal },
): Promise<SceneReviewDetail> {
  const response = await apiClient.get<SceneReviewDetail>(
    `/studios/${studioId}/scene-review/${taskId}`,
    { signal: options?.signal },
  );
  return response.data;
}

export function useSceneReviewListQuery(studioId: string, params: SceneReviewListParams) {
  return useQuery({
    queryKey: sceneReviewKeys.list(studioId, params),
    queryFn: ({ signal }) => getSceneReview(studioId, params, { signal }),
    enabled: Boolean(studioId),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export function useSceneReviewDetailQuery(studioId: string, taskId?: string) {
  return useQuery({
    queryKey: sceneReviewKeys.detail(studioId, taskId ?? ''),
    queryFn: ({ signal }) => getSceneReviewDetail(studioId, taskId as string, { signal }),
    enabled: Boolean(studioId && taskId),
    staleTime: 20_000,
  });
}
