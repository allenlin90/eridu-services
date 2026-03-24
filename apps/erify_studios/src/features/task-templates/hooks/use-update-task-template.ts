import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateStudioTaskTemplateInput } from '@eridu/api-types/task-management';

import { taskTemplateQueryKeys } from '@/features/task-templates/api/task-template-query-keys';
import {
  updateTaskTemplate,
  type UpdateTaskTemplateResponse,
} from '@/features/task-templates/api/update-task-template';

type UseUpdateTaskTemplateOptions = UseMutationOptions<
  UpdateTaskTemplateResponse,
  Error,
  UpdateStudioTaskTemplateInput
>;

type UseUpdateTaskTemplateProps = UseUpdateTaskTemplateOptions & {
  studioId: string;
  templateId: string;
};

export function useUpdateTaskTemplate({
  studioId,
  templateId,
  onSuccess,
  ...props
}: UseUpdateTaskTemplateProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStudioTaskTemplateInput) =>
      updateTaskTemplate(studioId, templateId, data),
    onSuccess: (updatedTemplate, ...args) => {
      queryClient.setQueryData(
        taskTemplateQueryKeys.detail(studioId, templateId),
        updatedTemplate,
      );

      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
      });

      onSuccess?.(updatedTemplate, ...args);
    },
    ...props,
  });
}
