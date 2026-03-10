import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';
import type { PaginationMeta } from '@eridu/api-types/pagination';

import { apiClient } from '@/lib/api/client';

export type StudioCreatorRosterItem = {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_alias_name: string;
  default_rate: string | null;
  default_rate_type: string | null;
  default_commission_rate: string | null;
  is_active: boolean;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StudioCreatorRosterCreateInput = {
  creator_id: string;
  default_rate?: number | null;
  default_rate_type?: string | null;
  default_commission_rate?: number | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

export type StudioCreatorRosterUpdateInput = {
  version: number;
  default_rate?: number | null;
  default_rate_type?: string | null;
  default_commission_rate?: number | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

export type StudioCreatorRosterListQuery = {
  page: number;
  limit: number;
  search?: string;
  is_active?: boolean;
  default_rate_type?: string;
};

export type StudioCreatorRosterListResponse = {
  data: StudioCreatorRosterItem[];
  meta: PaginationMeta;
};

const studioCreatorRosterKeys = {
  all: ['studio-creator-roster'] as const,
  list: (studioId: string, query: StudioCreatorRosterListQuery) =>
    [
      ...studioCreatorRosterKeys.all,
      studioId,
      query.page,
      query.limit,
      query.search ?? '',
      query.is_active ?? 'all',
      query.default_rate_type ?? 'all',
    ] as const,
  catalog: (studioId: string, search: string) =>
    [...studioCreatorRosterKeys.all, 'catalog', studioId, search] as const,
};

export function useStudioCreatorRoster(studioId: string, query: StudioCreatorRosterListQuery) {
  return useQuery({
    queryKey: studioCreatorRosterKeys.list(studioId, query),
    queryFn: async () => {
      const response = await apiClient.get<{
        data: Array<StudioCreatorRosterItem & {
          mc_id?: string;
          mc_name?: string;
          mc_alias_name?: string;
        }>;
        meta: PaginationMeta;
      }>(
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
      return {
        ...response.data,
        data: response.data.data.map((item) => ({
          ...item,
          creator_id: item.creator_id ?? item.mc_id ?? '',
          creator_name: item.creator_name ?? item.mc_name ?? '',
          creator_alias_name: item.creator_alias_name ?? item.mc_alias_name ?? '',
        })),
      };
    },
    enabled: Boolean(studioId),
  });
}

export function useStudioCreatorCatalog(studioId: string, search: string) {
  return useQuery({
    queryKey: studioCreatorRosterKeys.catalog(studioId, search),
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

export function useCreateStudioCreatorRosterItem(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StudioCreatorRosterCreateInput) => {
      const response = await apiClient.post<StudioCreatorRosterItem & {
        mc_id?: string;
        mc_name?: string;
        mc_alias_name?: string;
      }>(
        `/studios/${studioId}/creators/roster`,
        {
          ...payload,
          mc_id: payload.creator_id,
        },
      );
      return {
        ...response.data,
        creator_id: response.data.creator_id ?? response.data.mc_id ?? '',
        creator_name: response.data.creator_name ?? response.data.mc_name ?? '',
        creator_alias_name: response.data.creator_alias_name ?? response.data.mc_alias_name ?? '',
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...studioCreatorRosterKeys.all, studioId] });
      void queryClient.invalidateQueries({ queryKey: ['creator-availability'] });
    },
  });
}

export function useUpdateStudioCreatorRosterItem(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { creatorId: string; payload: StudioCreatorRosterUpdateInput }) => {
      const response = await apiClient.patch<StudioCreatorRosterItem & {
        mc_id?: string;
        mc_name?: string;
        mc_alias_name?: string;
      }>(
        `/studios/${studioId}/creators/roster/${params.creatorId}`,
        params.payload,
      );
      return {
        ...response.data,
        creator_id: response.data.creator_id ?? response.data.mc_id ?? '',
        creator_name: response.data.creator_name ?? response.data.mc_name ?? '',
        creator_alias_name: response.data.creator_alias_name ?? response.data.mc_alias_name ?? '',
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...studioCreatorRosterKeys.all, studioId] });
      void queryClient.invalidateQueries({ queryKey: ['creator-availability'] });
    },
  });
}

export function useDeleteStudioCreatorRosterItem(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creatorId: string) => {
      const response = await apiClient.delete<StudioCreatorRosterItem & {
        mc_id?: string;
        mc_name?: string;
        mc_alias_name?: string;
      }>(
        `/studios/${studioId}/creators/roster/${creatorId}`,
      );
      return {
        ...response.data,
        creator_id: response.data.creator_id ?? response.data.mc_id ?? '',
        creator_name: response.data.creator_name ?? response.data.mc_name ?? '',
        creator_alias_name: response.data.creator_alias_name ?? response.data.mc_alias_name ?? '',
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...studioCreatorRosterKeys.all, studioId] });
      void queryClient.invalidateQueries({ queryKey: ['creator-availability'] });
    },
  });
}
