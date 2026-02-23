import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { GenerateTasksRequest, GenerateTasksResponse } from '@eridu/api-types/task-management';

import { generateTasks } from '../api/generate-tasks';
import { studioShowsKeys } from '../api/get-studio-shows';

type UseGenerateTasksProps = {
  studioId: string;
  onSuccess?: () => void;
};

export function useGenerateTasks({ studioId, onSuccess }: UseGenerateTasksProps) {
  const queryClient = useQueryClient();

  return useMutation<GenerateTasksResponse, Error, GenerateTasksRequest>({
    mutationFn: (data) => generateTasks(studioId, data),
    onSuccess: (response) => {
      // Invalidate the studio shows query so the table refreshes and shows new tasks
      queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });

      const createdCount = response.summary.total_tasks_created;
      const skippedCount = response.summary.total_skipped;

      toast.success(
        `Generated ${createdCount} task${createdCount === 1 ? '' : 's'}${
          skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`,
      );

      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate tasks');
    },
  });
}
