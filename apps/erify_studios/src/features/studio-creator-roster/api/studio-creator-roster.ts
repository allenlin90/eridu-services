import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type {
  CreateStudioCreatorRosterInput,
  onboardCreatorInputSchema,
  StudioCreatorRosterItem,
  UpdateStudioCreatorRosterInput,
} from '@eridu/api-types/studio-creators';

import { creatorAvailabilityKeys } from '@/features/studio-show-creators/api/get-creator-availability';
import { creatorCatalogKeys } from '@/features/studio-show-creators/api/get-creator-catalog';
import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type StudioCreatorRosterResponse = PaginatedResponse<StudioCreatorRosterItem>;

export type GetStudioCreatorRosterParams = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  default_rate_type?: string;
};

export const studioCreatorRosterKeys = {
  all: ['studio-creator-roster'] as const,
  lists: () => [...studioCreatorRosterKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...studioCreatorRosterKeys.lists(), studioId] as const,
  list: (studioId: string, params?: GetStudioCreatorRosterParams) =>
    [...studioCreatorRosterKeys.listPrefix(studioId), params] as const,
};

export async function getStudioCreatorRoster(
  studioId: string,
  params?: GetStudioCreatorRosterParams,
  options?: { signal?: AbortSignal },
): Promise<StudioCreatorRosterResponse> {
  const { data } = await apiClient.get<StudioCreatorRosterResponse>(
    `/studios/${studioId}/creators`,
    {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        is_active: params?.is_active,
        default_rate_type: params?.default_rate_type || undefined,
      },
      signal: options?.signal,
    },
  );
  return data;
}

export async function addStudioCreatorToRoster(
  studioId: string,
  payload: CreateStudioCreatorRosterInput,
): Promise<StudioCreatorRosterItem> {
  const { data } = await apiClient.post<StudioCreatorRosterItem>(
    `/studios/${studioId}/creators`,
    payload,
  );
  return data;
}

export async function updateStudioCreatorRoster(
  studioId: string,
  creatorId: string,
  payload: UpdateStudioCreatorRosterInput,
): Promise<StudioCreatorRosterItem> {
  const { data } = await apiClient.patch<StudioCreatorRosterItem>(
    `/studios/${studioId}/creators/${creatorId}`,
    payload,
  );
  return data;
}

type OnboardStudioCreatorInput = z.infer<typeof onboardCreatorInputSchema>;

export async function onboardStudioCreator(
  studioId: string,
  payload: OnboardStudioCreatorInput,
): Promise<StudioCreatorRosterItem> {
  const { data } = await apiClient.post<StudioCreatorRosterItem>(
    `/studios/${studioId}/creators/onboard`,
    payload,
  );
  return data;
}

export function useStudioCreatorRosterQuery(
  studioId: string,
  params?: GetStudioCreatorRosterParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: studioCreatorRosterKeys.list(studioId, params),
    queryFn: ({ signal }) => getStudioCreatorRoster(studioId, params, { signal }),
    enabled: Boolean(studioId) && (options?.enabled ?? true),
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });
}

function invalidateStudioCreatorDependencies(queryClient: QueryClient, studioId: string) {
  void queryClient.invalidateQueries({
    queryKey: studioCreatorRosterKeys.listPrefix(studioId),
  });
  void queryClient.invalidateQueries({
    queryKey: creatorCatalogKeys.listPrefix(studioId),
  });
  void queryClient.invalidateQueries({
    queryKey: creatorAvailabilityKeys.listPrefix(studioId),
  });
}

export function useAddStudioCreatorToRoster(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudioCreatorRosterInput) => addStudioCreatorToRoster(studioId, payload),
    onSuccess: () => {
      invalidateStudioCreatorDependencies(queryClient, studioId);
    },
  });
}

export function useUpdateStudioCreatorRoster(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ creatorId, payload }: { creatorId: string; payload: UpdateStudioCreatorRosterInput }) =>
      updateStudioCreatorRoster(studioId, creatorId, payload),
    onSuccess: () => {
      invalidateStudioCreatorDependencies(queryClient, studioId);
    },
  });
}

export function useOnboardStudioCreator(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardStudioCreatorInput) => onboardStudioCreator(studioId, payload),
    onSuccess: () => {
      invalidateStudioCreatorDependencies(queryClient, studioId);
    },
  });
}
