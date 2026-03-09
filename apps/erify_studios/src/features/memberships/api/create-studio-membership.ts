import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { STUDIO_ROLE } from '@eridu/api-types/memberships';

import type { Membership } from './get-memberships';

import { apiClient } from '@/lib/api/client';

export type CreateStudioMembershipPayload = {
  user_id: string;
  role: (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE];
};

async function createStudioMembership(
  studioId: string,
  payload: CreateStudioMembershipPayload,
): Promise<Membership> {
  const response = await apiClient.post<Membership>(
    `/studios/${studioId}/studio-memberships`,
    payload,
  );
  return response.data;
}

export function useCreateStudioMembership(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStudioMembershipPayload) =>
      createStudioMembership(studioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['studio-memberships', 'list', studioId],
      });
    },
  });
}
