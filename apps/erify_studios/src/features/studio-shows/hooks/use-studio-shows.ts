import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { getStudioShows, studioShowsKeys } from '../api/get-studio-shows';

type UseStudioShowsProps = {
  studioId: string;
};

const TABLE_OPTIONS = {
  from: '/studios/$studioId/shows/',
  dateColumnId: 'start_time',
  paramNames: {
    search: 'search',
    startDate: 'date_from',
    endDate: 'date_to',
  },
  defaultSorting: [{ id: 'start_time', desc: true }],
};

export function useStudioShows({ studioId }: UseStudioShowsProps) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    dateRange,
  } = useTableUrlState(TABLE_OPTIONS);

  const searchQuery = (columnFilters.find((f) => f.id === 'search')?.value as string) || '';

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: studioShowsKeys.list(studioId, {
      page: pagination.pageIndex,
      limit: pagination.pageSize,
      search: searchQuery,
      dateRange,
    }),
    queryFn: () =>
      getStudioShows(studioId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: searchQuery || undefined,
        date_from: dateRange?.from?.toISOString(),
        date_to: dateRange?.to?.toISOString(),
        // Note: You can add has_tasks boolean logic later based on another column filter if needed.
      }),
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['studio-shows', studioId],
    });
  };

  return {
    data,
    shows: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    isLoading,
    isFetching,
    isError,
    refetch: handleRefresh,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  };
}
