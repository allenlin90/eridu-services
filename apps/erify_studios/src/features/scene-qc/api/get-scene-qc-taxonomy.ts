import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateSceneQcTaxonomyDefectInput,
  CreateSceneQcTaxonomyElementInput,
  SceneQcTaxonomy,
  SceneQcTaxonomyDefect,
  SceneQcTaxonomyElement,
} from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function getSceneQcTaxonomy(studioId: string, signal?: AbortSignal): Promise<SceneQcTaxonomy> {
  const response = await apiClient.get<SceneQcTaxonomy>(
    `/studios/${studioId}/scene-qc-taxonomy`,
    { signal },
  );
  return response.data;
}

export function useSceneQcTaxonomyQuery(studioId: string) {
  return useQuery({
    queryKey: sceneQcKeys.taxonomy(studioId),
    queryFn: ({ signal }) => getSceneQcTaxonomy(studioId, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSceneQcTaxonomyElement(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSceneQcTaxonomyElementInput) => {
      const response = await apiClient.post<SceneQcTaxonomyElement>(
        `/studios/${studioId}/scene-qc-taxonomy/elements`,
        body,
      );
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sceneQcKeys.taxonomy(studioId) }),
  });
}

export function useCreateSceneQcTaxonomyDefect(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSceneQcTaxonomyDefectInput) => {
      const response = await apiClient.post<SceneQcTaxonomyDefect>(
        `/studios/${studioId}/scene-qc-taxonomy/defects`,
        body,
      );
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sceneQcKeys.taxonomy(studioId) }),
  });
}

export function useRetireSceneQcTaxonomyEntry(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: 'elements' | 'defects'; id: string }) => {
      await apiClient.delete(`/studios/${studioId}/scene-qc-taxonomy/${input.kind}/${input.id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sceneQcKeys.taxonomy(studioId) }),
  });
}
