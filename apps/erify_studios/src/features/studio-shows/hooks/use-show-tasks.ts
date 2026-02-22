import { useQuery } from '@tanstack/react-query';

import { getShowTasks, showTasksKeys } from '../api/get-show-tasks';

type UseShowTasksProps = {
  studioId: string;
  showId: string;
};

export function useShowTasks({ studioId, showId }: UseShowTasksProps) {
  return useQuery({
    queryKey: showTasksKeys.list(studioId, showId),
    queryFn: () => getShowTasks(studioId, showId),
    staleTime: 60 * 1000,
    enabled: !!studioId && !!showId,
  });
}
