import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { AssignShowsRequest, AssignShowsResponse } from '@eridu/api-types/task-management';

import { assignShows } from '../api/assign-shows';
import { studioShowsKeys } from '../api/get-studio-shows';

type UseAssignShowsProps = {
  studioId: string;
  onSuccess?: () => void;
};

export function useAssignShows({ studioId, onSuccess }: UseAssignShowsProps) {
  const queryClient = useQueryClient();

  return useMutation<AssignShowsResponse, Error, AssignShowsRequest>({
    mutationFn: (data) => assignShows(studioId, data),
    onSuccess: (response) => {
      // Invalidate the studio shows query so the table reflects the new assignee counts
      queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });

      toast.success(
        `Assigned ${response.updated_count} task(s) to ${response.assignee.name}`,
      );

      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign tasks');
    },
  });
}
