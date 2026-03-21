import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskReportRunRequest, TaskReportScope } from '@eridu/api-types/task-management';

import { preflightTaskReport, runTaskReport } from '../api';

export function useTaskReportMutations(studioId: string) {
  const preflightMutation = useMutation({
    mutationFn: (scope: TaskReportScope) => preflightTaskReport(studioId, scope),
    onError: (error) => {
      toast.error('Failed to preflight report scope.');
      console.error(error);
    },
  });

  const runMutation = useMutation({
    mutationFn: (payload: TaskReportRunRequest) => runTaskReport(studioId, payload),
    onError: (error) => {
      toast.error('Failed to generate report.');
      console.error(error);
    },
  });

  return {
    preflightMutation,
    runMutation,
  };
}
