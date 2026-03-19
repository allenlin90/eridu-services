import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTaskReportDefinition } from '../api/delete-task-report-definition';
import { taskReportDefinitionKeys } from '../api/keys';

type UseDeleteTaskReportDefinitionParams = {
  studioId: string;
};

export function useDeleteTaskReportDefinition({ studioId }: UseDeleteTaskReportDefinitionParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (definitionId: string) => deleteTaskReportDefinition(studioId, definitionId),
    onSuccess: (_data, definitionId) => {
      queryClient.removeQueries({ queryKey: taskReportDefinitionKeys.detail(studioId, definitionId) });
      void queryClient.invalidateQueries({ queryKey: taskReportDefinitionKeys.lists(studioId) });
    },
  });
}
