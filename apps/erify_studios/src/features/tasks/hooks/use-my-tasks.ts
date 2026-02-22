import { useQuery } from '@tanstack/react-query';

import type { ListMyTasksQuery } from '@eridu/api-types/task-management';

import { getMyTasks, myTasksKeys } from '../api/get-my-tasks';

export function useMyTasks(query: ListMyTasksQuery) {
  return useQuery({
    queryKey: myTasksKeys.list(query),
    queryFn: () => getMyTasks(query),
    staleTime: 5 * 60 * 1000,
  });
}
