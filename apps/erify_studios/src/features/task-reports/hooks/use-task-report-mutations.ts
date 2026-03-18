import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskReportPreflightRequest, TaskReportRunRequest } from '@eridu/api-types/task-management';

import { preflightTaskReport, runTaskReport } from '../api';

export function useTaskReportMutations(studioId: string) {
  const preflightMutation = useMutation({
    mutationFn: (payload: TaskReportPreflightRequest) => preflightTaskReport(studioId, payload),
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
