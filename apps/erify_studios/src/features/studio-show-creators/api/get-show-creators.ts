import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ShowCreatorCompensationSummary,
  StudioShowCreatorListItem,
  UpdateStudioShowCreatorInput,
} from '@eridu/api-types/studio-creators';

import { apiClient } from '@/lib/api/client';

export const showCreatorsKeys = {
  all: ['show-creators'] as const,
  list: (studioId: string, showId: string) => [...showCreatorsKeys.all, 'list', studioId, showId] as const,
  compensationSummary: (studioId: string, showId: string) =>
    [...showCreatorsKeys.all, 'compensation-summary', studioId, showId] as const,
};

export async function getShowCreators(studioId: string, showId: string): Promise<StudioShowCreatorListItem[]> {
  const response = await apiClient.get<StudioShowCreatorListItem[]>(
    `/studios/${studioId}/shows/${showId}/creators`,
  );
  return response.data;
}

export async function updateShowCreatorAssignment(
  studioId: string,
  showId: string,
  showCreatorId: string,
  payload: UpdateStudioShowCreatorInput,
): Promise<StudioShowCreatorListItem> {
  const response = await apiClient.patch<StudioShowCreatorListItem>(
    `/studios/${studioId}/shows/${showId}/creators/${showCreatorId}`,
    payload,
  );
  return response.data;
}

export function useShowCreatorsQuery(studioId: string, showId: string) {
  return useQuery({
    queryKey: showCreatorsKeys.list(studioId, showId),
    queryFn: () => getShowCreators(studioId, showId),
    enabled: Boolean(studioId && showId),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateShowCreatorAssignment(studioId: string, showId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudioShowCreatorInput }) =>
      updateShowCreatorAssignment(studioId, showId, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: showCreatorsKeys.list(studioId, showId),
      });
      void queryClient.invalidateQueries({
        queryKey: showCreatorsKeys.compensationSummary(studioId, showId),
      });
    },
  });
}

export async function getShowCreatorCompensationSummary(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<ShowCreatorCompensationSummary> {
  const response = await apiClient.get<ShowCreatorCompensationSummary>(
    `/studios/${studioId}/shows/${showId}/creators/compensation-summary`,
    { signal: options?.signal },
  );
  return response.data;
}

export function useShowCreatorCompensationSummary(studioId: string, showId: string, enabled = true) {
  return useQuery({
    queryKey: showCreatorsKeys.compensationSummary(studioId, showId),
    queryFn: ({ signal }) => getShowCreatorCompensationSummary(studioId, showId, { signal }),
    enabled: enabled && Boolean(studioId && showId),
    placeholderData: keepPreviousData,
  });
}
