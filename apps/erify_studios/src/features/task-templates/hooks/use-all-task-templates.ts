import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { getTaskTemplates } from '../api/get-task-templates';
import { taskTemplateQueryKeys } from '../api/task-template-query-keys';

type UseAllTaskTemplatesProps = {
  studioId: string;
  search?: string;
  pageSize?: number;
  enabled?: boolean;
};

export function useAllTaskTemplates({
  studioId,
  search,
  pageSize = 100,
  enabled = true,
}: UseAllTaskTemplatesProps) {
  const queryClient = useQueryClient();
  const pickerQueryKey = useMemo(
    () => taskTemplateQueryKeys.allPicker(studioId, { search, pageSize }),
    [studioId, search, pageSize],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    ...restQuery
  } = useInfiniteQuery({
    queryKey: pickerQueryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getTaskTemplates(studioId, {
        page: pageParam,
        limit: pageSize,
        name: search,
      }, { signal }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page >= lastPage.meta.totalPages) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Auto-drain all pages while the dialog is open so "Select all" means all active templates.
  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const queryState = queryClient.getQueryState(pickerQueryKey);
    if (queryState?.isInvalidated) {
      void refetch();
    }
  }, [enabled, pickerQueryKey, queryClient, refetch]);

  const allTemplates = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  return {
    ...restQuery,
    data: allTemplates,
    isLoading: isLoading || isFetchingNextPage,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  };
}
