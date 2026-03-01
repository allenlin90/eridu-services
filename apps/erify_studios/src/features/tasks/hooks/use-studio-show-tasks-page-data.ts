import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { useShowTasks } from '@/features/studio-shows/hooks/use-show-tasks';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

type UseStudioShowTasksPageDataProps = {
  studioId: string;
  showId: string;
  showFromNavigation: StudioShowDetail | null;
};

function getShowFromStudioShowsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  studioId: string,
  showId: string,
): { show: StudioShowDetail | null; updatedAt: number | null } {
  const cachedQueries = queryClient.getQueryCache().findAll({
    queryKey: studioShowsKeys.listPrefix(studioId),
  });

  for (const query of cachedQueries) {
    const cached = query.state.data as { data?: StudioShow[] } | undefined;
    const cachedShow = cached?.data?.find((show) => show.id === showId);
    if (cachedShow) {
      return {
        show: cachedShow as StudioShowDetail,
        updatedAt: query.state.dataUpdatedAt,
      };
    }
  }

  return { show: null, updatedAt: null };
}

export function useStudioShowTasksPageData({
  studioId,
  showId,
  showFromNavigation,
}: UseStudioShowTasksPageDataProps) {
  const queryClient = useQueryClient();
  const cachedShowDetails = useMemo(
    () => getShowFromStudioShowsCache(queryClient, studioId, showId),
    [queryClient, showId, studioId],
  );
  const initialShowDetails = showFromNavigation ?? cachedShowDetails.show;
  const initialShowDetailsUpdatedAt = initialShowDetails
    ? (cachedShowDetails.updatedAt ?? 0)
    : undefined;

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    refetch: refetchTasks,
  } = useShowTasks({ studioId, showId });
  const {
    data: showDetails,
    isLoading: isLoadingShow,
    isFetching: isFetchingShow,
    refetch: refetchShow,
  } = useStudioShow({
    studioId,
    showId,
    initialData: initialShowDetails ?? undefined,
    initialDataUpdatedAt: initialShowDetailsUpdatedAt ?? undefined,
  });
  const {
    data: membersResponse,
    isLoading: isLoadingMembers,
    isFetching: isFetchingMembers,
    refetch: refetchMembers,
  } = useMembershipsQuery({
    studio_id: studioId,
    limit: 100, // get enough members to populate the dropdown
  });

  const rawMembers = membersResponse?.data;
  const members = useMemo(() => rawMembers ?? [], [rawMembers]);
  const taskList = useMemo(() => tasks ?? [], [tasks]);
  const isTableLoading = isLoadingTasks || isLoadingMembers;
  const isRefreshing = isFetchingTasks || isFetchingShow || isFetchingMembers;

  const refreshAll = useCallback(async () => {
    await Promise.all([refetchTasks(), refetchShow(), refetchMembers()]);
  }, [refetchMembers, refetchShow, refetchTasks]);
  const refetchShowTasks = useCallback(() => {
    void refetchTasks();
  }, [refetchTasks]);

  return {
    members,
    taskList,
    showDetails,
    isLoadingShow,
    isTableLoading,
    isRefreshing,
    refreshAll,
    refetchShowTasks,
  };
}
