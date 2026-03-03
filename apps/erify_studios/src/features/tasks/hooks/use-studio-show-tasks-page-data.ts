import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { useShowTasks } from '@/features/studio-shows/hooks/use-show-tasks';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

type UseStudioShowTasksPageDataProps = {
  studioId: string;
  showId: string;
  showFromNavigation: StudioShowDetail | null;
  memberSearch: string;
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
  memberSearch,
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
  } = useStudioMembershipsQuery(studioId, {
    limit: 50, // default first page for better combobox UX
    name: memberSearch || undefined,
  });

  const rawMembers = membersResponse?.data;
  const members = useMemo(() => rawMembers ?? [], [rawMembers]);
  const taskList = useMemo(() => tasks ?? [], [tasks]);
  const isMembersInitialLoading = isLoadingMembers && members.length === 0;
  const isTableLoading = isLoadingTasks || isMembersInitialLoading;
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
