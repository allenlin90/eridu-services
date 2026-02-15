import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import { deleteTaskTemplate } from '../api/delete-task-template';

type UseDeleteTaskTemplateOptions = UseMutationOptions<void, Error, string>;

type UseDeleteTaskTemplateProps = UseDeleteTaskTemplateOptions & {
  studioId: string;
};

export function useDeleteTaskTemplate({
  studioId,
  onSuccess,
  ...props
}: UseDeleteTaskTemplateProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteTaskTemplate(studioId, templateId),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: ['task-templates', studioId],
      });
      onSuccess?.(...args);
    },
    ...props,
  });
}
