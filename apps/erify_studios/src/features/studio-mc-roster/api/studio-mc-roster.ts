import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';
import type { PaginationMeta } from '@eridu/api-types/pagination';

import { apiClient } from '@/lib/api/client';

export type StudioMcRosterItem = {
  id: string;
  mc_id: string;
  mc_name: string;
  mc_alias_name: string;
  default_rate: string | null;
  default_rate_type: string | null;
  default_commission_rate: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StudioMcRosterCreateInput = {
  mc_id: string;
  default_rate?: number | null;
  default_rate_type?: string | null;
  default_commission_rate?: number | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

export type StudioMcRosterUpdateInput = {
  default_rate?: number | null;
  default_rate_type?: string | null;
  default_commission_rate?: number | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

export type StudioMcRosterListQuery = {
  page: number;
  limit: number;
  search?: string;
  is_active?: boolean;
  default_rate_type?: string;
};

export type StudioMcRosterListResponse = {
  data: StudioMcRosterItem[];
  meta: PaginationMeta;
};

const studioMcRosterKeys = {
  all: ['studio-mc-roster'] as const,
  list: (studioId: string, query: StudioMcRosterListQuery) =>
    [
      ...studioMcRosterKeys.all,
      studioId,
      query.page,
      query.limit,
      query.search ?? '',
      query.is_active ?? 'all',
      query.default_rate_type ?? 'all',
    ] as const,
  catalog: (studioId: string, search: string) =>
    [...studioMcRosterKeys.all, 'catalog', studioId, search] as const,
};

export function useStudioMcRoster(studioId: string, query: StudioMcRosterListQuery) {
  return useQuery({
    queryKey: studioMcRosterKeys.list(studioId, query),
    queryFn: async () => {
      const response = await apiClient.get<StudioMcRosterListResponse>(
        `/studios/${studioId}/creators/roster`,
        {
          params: {
            page: query.page,
            limit: query.limit,
            search: query.search || undefined,
            is_active: query.is_active,
            default_rate_type: query.default_rate_type || undefined,
          },
        },
      );
      return response.data;
    },
    enabled: Boolean(studioId),
  });
}

export function useStudioMcCatalog(studioId: string, search: string) {
  return useQuery({
    queryKey: studioMcRosterKeys.catalog(studioId, search),
    queryFn: async () => {
      const response = await apiClient.get<CreatorApiResponse[]>(
        `/studios/${studioId}/creators/catalog`,
        { params: { search, limit: 50 } },
      );
      return response.data;
    },
    enabled: Boolean(studioId),
  });
}

export function useCreateStudioMcRosterItem(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StudioMcRosterCreateInput) => {
      const response = await apiClient.post<StudioMcRosterItem>(
        `/studios/${studioId}/creators/roster`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...studioMcRosterKeys.all, studioId] });
      void queryClient.invalidateQueries({ queryKey: ['mc-availability'] });
    },
  });
}

export function useUpdateStudioMcRosterItem(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { mcId: string; payload: StudioMcRosterUpdateInput }) => {
      const response = await apiClient.patch<StudioMcRosterItem>(
        `/studios/${studioId}/creators/roster/${params.mcId}`,
        params.payload,
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...studioMcRosterKeys.all, studioId] });
      void queryClient.invalidateQueries({ queryKey: ['mc-availability'] });
    },
  });
}

export function useDeleteStudioMcRosterItem(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mcId: string) => {
      const response = await apiClient.delete<StudioMcRosterItem>(
        `/studios/${studioId}/creators/roster/${mcId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...studioMcRosterKeys.all, studioId] });
      void queryClient.invalidateQueries({ queryKey: ['mc-availability'] });
    },
  });
}
