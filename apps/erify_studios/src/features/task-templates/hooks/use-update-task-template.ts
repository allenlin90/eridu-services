import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import type { UpdateStudioTaskTemplateInput } from '@eridu/api-types/task-management';

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
    onSuccess: (...args) => {
      queryClient.resetQueries({
        queryKey: ['task-template', studioId, templateId],
      });
      queryClient.resetQueries({
        queryKey: ['task-templates', studioId],
      });
      onSuccess?.(...args);
    },
    ...props,
  });
}
