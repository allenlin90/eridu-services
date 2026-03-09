import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export type ShowMc = {
  id: string;
  show_id: string | null;
  show_name: string | null;
  mc_id: string | null;
  mc_name: string | null;
  mc_alias_name: string | null;
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

export const showMcKeys = {
  all: ['studio-show-mcs'] as const,
  list: (studioId: string, showId: string, params?: unknown) =>
    [...showMcKeys.all, studioId, showId, params] as const,
};

export async function getShowMcs(
  studioId: string,
  showId: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedResponse<ShowMc>> {
  const response = await apiClient.get<PaginatedResponse<ShowMc>>(
    `/studios/${studioId}/shows/${showId}/mcs`,
    { params },
  );
  return response.data;
}

export function useShowMcsQuery(
  studioId: string,
  showId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: showMcKeys.list(studioId, showId, params),
    queryFn: () => getShowMcs(studioId, showId, params),
    enabled: Boolean(studioId && showId),
  });
}
