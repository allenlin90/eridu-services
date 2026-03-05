import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { getTaskTemplates } from '../api/get-task-templates';

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
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    ...restQuery
  } = useInfiniteQuery({
    queryKey: ['task-templates', studioId, 'all', { search, pageSize }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getTaskTemplates(studioId, {
        page: pageParam,
        limit: pageSize,
        name: search,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page >= lastPage.meta.totalPages) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    enabled,
  });

  // Auto-drain all pages while the dialog is open so "Select all" means all active templates.
  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage]);

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
