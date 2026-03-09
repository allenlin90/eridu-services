import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Membership } from './get-memberships';

import { apiClient } from '@/lib/api/client';

async function deleteStudioMembership(
  studioId: string,
  membershipId: string,
): Promise<Membership> {
  const response = await apiClient.delete<Membership>(
    `/studios/${studioId}/studio-memberships/${membershipId}`,
  );
  return response.data;
}

export function useDeleteStudioMembership(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membershipId: string) => deleteStudioMembership(studioId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['studio-memberships', 'list', studioId],
      });
    },
  });
}
