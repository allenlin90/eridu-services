import type { QueryClient } from '@tanstack/react-query';

import { showTasksKeys } from '../api/get-show-tasks';
import { studioShowsKeys } from '../api/get-studio-shows';

type InvalidateStudioTaskQueriesParams = {
  queryClient: QueryClient;
  studioId: string;
  showIds?: string[];
};

export async function invalidateStudioTaskQueries({
  queryClient,
  studioId,
  showIds = [],
}: InvalidateStudioTaskQueriesParams) {
  const uniqueShowIds = [...new Set(showIds)];
  await queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });

  await Promise.all(uniqueShowIds.map((showId) =>
    queryClient.invalidateQueries({
      queryKey: showTasksKeys.list(studioId, showId),
      exact: true,
      // Avoid fetching inactive cache entries that may not carry a queryFn.
      refetchType: 'active',
    })));
}

type RefetchStudioShowListsContainingShowParams = {
  queryClient: QueryClient;
  studioId: string;
  showId: string;
};

export async function refetchStudioShowListsContainingShow({
  queryClient,
  studioId,
  showId,
}: RefetchStudioShowListsContainingShowParams) {
  const cachedStudioShowQueries = queryClient.getQueryCache().findAll({
    queryKey: studioShowsKeys.listPrefix(studioId),
  });

  const matchingKeys = cachedStudioShowQueries
    .filter((query) => {
      const data = query.state.data as { data?: Array<{ id: string }> } | undefined;
      return data?.data?.some((show) => show.id === showId) ?? false;
    })
    .map((query) => query.queryKey);

  await Promise.all(
    matchingKeys.map((queryKey) =>
      queryClient.refetchQueries({
        queryKey,
        exact: true,
        type: 'all',
      })),
  );
}
