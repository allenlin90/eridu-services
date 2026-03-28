import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { StudioCreatorCatalogItem } from '@eridu/api-types/studio-creators';

import { apiClient } from '@/lib/api/client';

export type CreatorCatalogQuery = {
  search?: string;
  include_rostered?: boolean;
  limit?: number;
};

export const creatorCatalogKeys = {
  all: ['creator-catalog'] as const,
  lists: () => [...creatorCatalogKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...creatorCatalogKeys.lists(), studioId] as const,
  list: (studioId: string, query: CreatorCatalogQuery) => [...creatorCatalogKeys.listPrefix(studioId), query] as const,
};

export async function getCreatorCatalog(
  studioId: string,
  query: CreatorCatalogQuery,
  options?: { signal?: AbortSignal },
): Promise<StudioCreatorCatalogItem[]> {
  const response = await apiClient.get<StudioCreatorCatalogItem[]>(
    `/studios/${studioId}/creators/catalog`,
    { params: query, signal: options?.signal },
  );
  return response.data;
}

export function useCreatorCatalogQuery(
  studioId: string,
  query: CreatorCatalogQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: creatorCatalogKeys.list(studioId, query),
    queryFn: ({ signal }) => getCreatorCatalog(studioId, query, { signal }),
    enabled: enabled && Boolean(studioId),
    placeholderData: keepPreviousData,
  });
}
