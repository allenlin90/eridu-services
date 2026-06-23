import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskDto } from '@eridu/api-types/task-management';

import { myTasksKeys } from '../api/get-my-tasks';
import { studioTasksKeys } from '../api/get-studio-tasks';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  GATE_ALREADY_CLAIMED: 'Someone already claimed this gate. Refresh to see who owns it.',
};

export async function claimTask(studioId: string, taskId: string): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/studios/${studioId}/tasks/${taskId}/claim`);
  return response.data;
}

export function useClaimTask({ studioId }: { studioId: string }) {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string }>({
    mutationFn: ({ taskId }) => claimTask(studioId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioTasksKeys.all(studioId) });
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
      toast.success('Gate claimed');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to claim gate', CLAIM_ERROR_MESSAGES));
    },
  });
}
