import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ListTaskReportDefinitionsQuery } from '@eridu/api-types/task-management';

import { getTaskReportDefinitions } from '../api/get-task-report-definitions';
import { taskReportDefinitionKeys } from '../api/keys';

type UseTaskReportDefinitionsParams = {
  studioId: string;
  query: ListTaskReportDefinitionsQuery;
};

export function useTaskReportDefinitions({ studioId, query }: UseTaskReportDefinitionsParams) {
  return useQuery({
    queryKey: taskReportDefinitionKeys.list(studioId, query),
    queryFn: ({ signal }) => getTaskReportDefinitions(studioId, query, { signal }),
    placeholderData: keepPreviousData,
  });
}
