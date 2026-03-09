import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

type UpdateStudioMembershipHelperParams = {
  studioId: string;
  membershipId: string;
  isHelper: boolean;
};

async function updateStudioMembershipHelper({
  studioId,
  membershipId,
  isHelper,
}: UpdateStudioMembershipHelperParams) {
  const response = await apiClient.patch(
    `/studios/${studioId}/studio-memberships/${membershipId}/helper`,
    { is_helper: isHelper },
  );
  return response.data;
}

export function useUpdateStudioMembershipHelper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStudioMembershipHelper,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studio-memberships', 'list', variables.studioId] });
    },
  });
}
