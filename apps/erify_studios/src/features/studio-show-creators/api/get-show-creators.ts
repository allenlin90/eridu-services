import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export type ShowCreator = {
  id: string;
  show_id: string | null;
  show_name: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_alias_name: string | null;
  note: string | null;
  agreed_rate: string | null;
  compensation_type: string | null;
  commission_rate: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const showCreatorKeys = {
  all: ['studio-show-creators'] as const,
  list: (studioId: string, showId: string, params?: unknown) =>
    [...showCreatorKeys.all, studioId, showId, params] as const,
};

export async function getShowCreators(
  studioId: string,
  showId: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedResponse<ShowCreator>> {
  const response = await apiClient.get<PaginatedResponse<ShowCreator>>(
    `/studios/${studioId}/shows/${showId}/creators`,
    { params },
  );
  return response.data;
}

export function useShowCreatorsQuery(
  studioId: string,
  showId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: showCreatorKeys.list(studioId, showId, params),
    queryFn: () => getShowCreators(studioId, showId, params),
    enabled: Boolean(studioId && showId),
  });
}
