import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ListMyTasksQuery } from '@eridu/api-types/task-management';

import { getMyTasks, myTasksKeys } from '../api/get-my-tasks';

export function useMyTasks(query: ListMyTasksQuery) {
  return useQuery({
    queryKey: myTasksKeys.list(query),
    queryFn: ({ signal }) => getMyTasks(query, { signal }),
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
