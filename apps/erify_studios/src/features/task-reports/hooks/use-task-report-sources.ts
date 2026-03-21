import { useQuery } from '@tanstack/react-query';

import type { TaskReportScope, TaskReportSourcesResponse } from '@eridu/api-types/task-management';

import { getTaskReportSources } from '../api/get-task-report-sources';
import { taskReportSourceKeys } from '../api/keys';

export function useTaskReportSources(studioId: string, scope: TaskReportScope | null) {
  return useQuery<TaskReportSourcesResponse>({
    queryKey: taskReportSourceKeys.list(studioId, scope || {}),
    queryFn: ({ signal }) => getTaskReportSources(studioId, (scope || {}) as TaskReportScope, { signal }),
    enabled: Boolean(scope?.date_from && scope?.date_to),
  });
}
