import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { GenerateTasksRequest, GenerateTasksResponse } from '@eridu/api-types/task-management';

import { generateTasks } from '../api/generate-tasks';
import { invalidateStudioTaskQueries } from '../lib/invalidate-studio-task-queries';

type UseGenerateTasksProps = {
  studioId: string;
  onSuccess?: () => void;
};

export function useGenerateTasks({ studioId, onSuccess }: UseGenerateTasksProps) {
  const queryClient = useQueryClient();

  return useMutation<GenerateTasksResponse, Error, GenerateTasksRequest>({
    mutationFn: (data) => generateTasks(studioId, data),
    onSuccess: async (response, variables) => {
      await invalidateStudioTaskQueries({
        queryClient,
        studioId,
        showIds: variables.show_uids,
      });

      const createdCount = response.summary.total_tasks_created;
      const skippedCount = response.summary.total_skipped;

      toast.success(
        `Generated ${createdCount} task${createdCount === 1 ? '' : 's'}${
          skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`,
      );

      onSuccess?.();
    },
    ,
  });
}
