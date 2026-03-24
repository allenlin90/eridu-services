import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTaskTemplate } from '../api/delete-task-template';
import { taskTemplateQueryKeys } from '../api/task-template-query-keys';

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
    onSuccess: (_result, deletedTemplateId, ...args) => {
      queryClient.removeQueries({
        queryKey: taskTemplateQueryKeys.detail(studioId, deletedTemplateId),
      });

      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
      });

      onSuccess?.(_result, deletedTemplateId, ...args);
    },
    ...props,
  });
}
