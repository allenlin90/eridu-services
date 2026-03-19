import { useQuery } from '@tanstack/react-query';

import { getTaskReportDefinition } from '../api/get-task-report-definition';
import { taskReportDefinitionKeys } from '../api/keys';

type UseTaskReportDefinitionParams = {
  studioId: string;
  definitionId: string | undefined;
};

export function useTaskReportDefinition({ studioId, definitionId }: UseTaskReportDefinitionParams) {
  return useQuery({
    queryKey: taskReportDefinitionKeys.detail(studioId, definitionId ?? '__missing__'),
    queryFn: ({ signal }) => getTaskReportDefinition(studioId, definitionId as string, { signal }),
    enabled: Boolean(definitionId),
  });
}
