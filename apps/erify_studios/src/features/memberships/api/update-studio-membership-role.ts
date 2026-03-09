import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { STUDIO_ROLE } from '@eridu/api-types/memberships';

import type { Membership } from './get-memberships';

import { apiClient } from '@/lib/api/client';

type UpdateStudioMembershipRolePayload = {
  membershipId: string;
  role: (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE];
};

async function updateStudioMembershipRole(
  studioId: string,
  payload: UpdateStudioMembershipRolePayload,
): Promise<Membership> {
  const response = await apiClient.patch<Membership>(
    `/studios/${studioId}/studio-memberships/${payload.membershipId}/role`,
    { role: payload.role },
  );
  return response.data;
}

export function useUpdateStudioMembershipRole(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStudioMembershipRolePayload) =>
      updateStudioMembershipRole(studioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['studio-memberships', 'list', studioId],
      });
    },
  });
}
