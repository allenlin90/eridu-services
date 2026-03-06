import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { TaskTemplateDto } from '@eridu/api-types/task-management';
import { useTableUrlState, type UseTableUrlStateReturn } from '@eridu/ui';

import { getTaskTemplates } from '../api/get-task-templates';

type UseTaskTemplatesProps = {
  studioId: string;
};

type UseTaskTemplatesReturn = {
  tableState: UseTableUrlStateReturn;
  templates: TaskTemplateDto[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

export function useTaskTemplates({ studioId }: UseTaskTemplatesProps): UseTaskTemplatesReturn {
  const tableState = useTableUrlState({
    from: '/studios/$studioId/task-templates',
    searchColumnId: 'name',
    defaultSorting: [{ id: 'updatedAt', desc: true }],
  });

  const { columnFilters } = tableState;

  // Extract search query from columnFilters
  const searchQuery = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['task-templates', studioId, searchQuery],
    queryFn: ({ pageParam }) =>
      getTaskTemplates(studioId, {
        limit: 10,
        name: searchQuery,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined),
  });

  const templates = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const total = data?.pages[0]?.meta.total ?? 0;

  return {
    tableState,
    templates,
    total,
    isLoading,
    isFetching,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}
