import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddStudioMemberRequest,
  StudioMemberResponse,
  UpdateStudioMemberRequest,
} from '@eridu/api-types/memberships';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type StudioMembersResponse = PaginatedResponse<StudioMemberResponse>;

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const studioMemberKeys = {
  all: ['studio-members'] as const,
  lists: () => [...studioMemberKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...studioMemberKeys.lists(), studioId] as const,
  list: (studioId: string) => [...studioMemberKeys.listPrefix(studioId)] as const,
};

// ---------------------------------------------------------------------------
// API fetchers
// ---------------------------------------------------------------------------

export async function getStudioMembers(
  studioId: string,
  options?: { signal?: AbortSignal },
): Promise<StudioMembersResponse> {
  const { data } = await apiClient.get<StudioMembersResponse>(
    `/studios/${studioId}/members`,
    { signal: options?.signal },
  );
  return data;
}

export async function addStudioMember(
  studioId: string,
  payload: AddStudioMemberRequest,
): Promise<StudioMemberResponse> {
  const { data } = await apiClient.post<StudioMemberResponse>(
    `/studios/${studioId}/members`,
    payload,
  );
  return data;
}

export async function updateStudioMember(
  studioId: string,
  membershipId: string,
  payload: UpdateStudioMemberRequest,
): Promise<StudioMemberResponse> {
  const { data } = await apiClient.patch<StudioMemberResponse>(
    `/studios/${studioId}/members/${membershipId}`,
    payload,
  );
  return data;
}

export async function removeStudioMember(
  studioId: string,
  membershipId: string,
): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/members/${membershipId}`);
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useStudioMembers(studioId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: studioMemberKeys.list(studioId),
    queryFn: ({ signal }) => getStudioMembers(studioId, { signal }),
    enabled: Boolean(studioId) && (options?.enabled ?? true),
    staleTime: 20_000,
  });
}

export function useAddStudioMember(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddStudioMemberRequest) => addStudioMember(studioId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studioMemberKeys.listPrefix(studioId),
      });
    },
  });
}

export function useUpdateStudioMember(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, payload }: { membershipId: string; payload: UpdateStudioMemberRequest }) =>
      updateStudioMember(studioId, membershipId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studioMemberKeys.listPrefix(studioId),
      });
    },
  });
}

export function useRemoveStudioMember(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => removeStudioMember(studioId, membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studioMemberKeys.listPrefix(studioId),
      });
    },
  });
}
