import { useQuery } from '@tanstack/react-query';

import { getTaskTemplates } from '../api/get-task-templates';

type UseAllTaskTemplatesProps = {
  studioId: string;
  search?: string;
  limit?: number;
};

export function useAllTaskTemplates({
  studioId,
  search,
  limit = 10,
}: UseAllTaskTemplatesProps) {
  return useQuery({
    queryKey: ['task-templates', studioId, 'all', { search, limit }],
    queryFn: () =>
      getTaskTemplates(studioId, {
        limit,
        page: 1,
        name: search,
      }),
    select: (data) => data.data, // Just return the array of templates
    staleTime: 5 * 60 * 1000,
  });
}
