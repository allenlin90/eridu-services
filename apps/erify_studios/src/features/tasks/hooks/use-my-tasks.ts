import { useQuery } from '@tanstack/react-query';

import type { ListMyTasksQuery } from '@eridu/api-types/task-management';

import { getMyTasks, myTasksKeys } from '../api/get-my-tasks';

export function useMyTasks(query: ListMyTasksQuery) {
  return useQuery({
    queryKey: myTasksKeys.list(query),
    queryFn: () => getMyTasks(query),
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
