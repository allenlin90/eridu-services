import { useQuery } from '@tanstack/react-query';

import { getTaskTemplates } from '../api/get-task-templates';

type UseAllTaskTemplatesProps = {
  studioId: string;
};

export function useAllTaskTemplates({ studioId }: UseAllTaskTemplatesProps) {
  return useQuery({
    queryKey: ['task-templates', studioId, 'all'],
    queryFn: () =>
      getTaskTemplates(studioId, {
        limit: 100,
        page: 1,
      }),
    select: (data) => data.data, // Just return the array of templates
    staleTime: 5 * 60 * 1000,
  });
}
