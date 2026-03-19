import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateTaskReportDefinitionInput, UpdateTaskReportDefinitionInput } from '@eridu/api-types/task-management';

import { createTaskReportDefinition } from '../api/create-task-report-definition';
import { taskReportDefinitionKeys } from '../api/keys';
import { updateTaskReportDefinition } from '../api/update-task-report-definition';

type UseTaskReportDefinitionMutationsParams = {
  studioId: string;
};

export function useTaskReportDefinitionMutations({
  studioId,
}: UseTaskReportDefinitionMutationsParams) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskReportDefinitionInput) =>
      createTaskReportDefinition(studioId, payload),
    onSuccess: (definition) => {
      queryClient.setQueryData(taskReportDefinitionKeys.detail(studioId, definition.id), definition);
      void queryClient.invalidateQueries({ queryKey: taskReportDefinitionKeys.lists(studioId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      definitionId,
      payload,
    }: {
      definitionId: string;
      payload: UpdateTaskReportDefinitionInput;
    }) => updateTaskReportDefinition(studioId, definitionId, payload),
    onSuccess: (definition) => {
      queryClient.setQueryData(taskReportDefinitionKeys.detail(studioId, definition.id), definition);
      void queryClient.invalidateQueries({ queryKey: taskReportDefinitionKeys.lists(studioId) });
    },
  });

  return {
    createMutation,
    updateMutation,
  };
}
