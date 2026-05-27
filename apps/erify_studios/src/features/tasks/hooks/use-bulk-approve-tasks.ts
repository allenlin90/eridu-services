import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { BulkApproveTasksResponse } from '@eridu/api-types/task-management';

import { bulkApproveTasks } from '../api/bulk-approve-tasks';

import { studioTasksKeys } from '@/features/tasks/api/get-studio-tasks';

type UseBulkApproveTasksProps = {
  studioId: string;
  onSuccess?: (response: BulkApproveTasksResponse) => void;
};

export function useBulkApproveTasks({ studioId, onSuccess }: UseBulkApproveTasksProps) {
  const queryClient = useQueryClient();

  return useMutation<BulkApproveTasksResponse, Error, string[]>({
    mutationFn: (taskUids) => bulkApproveTasks(studioId, { task_uids: taskUids }),
    onSuccess: async (response) => {
      // Invalidate the tasks lists query so everything updates automatically
      queryClient.invalidateQueries({ queryKey: studioTasksKeys.all(studioId) });

      const approvedCount = response.summary.total_success;
      const failedCount = response.summary.total_failed;

      if (failedCount === 0) {
        toast.success(
          approvedCount === 1
            ? '1 task approved successfully'
            : `${approvedCount} tasks approved successfully`,
        );
      } else {
        toast.warning(
          `${approvedCount} approved successfully, ${failedCount} failed`,
        );
      }

      onSuccess?.(response);
    },
  });
}
