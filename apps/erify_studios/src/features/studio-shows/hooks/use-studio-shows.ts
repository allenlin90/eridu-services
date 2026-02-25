import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { getStudioShows, studioShowsKeys } from '../api/get-studio-shows';

type UseStudioShowsProps = {
  studioId: string;
};

const TABLE_OPTIONS = {
  from: '/studios/$studioId/shows/',
  searchColumnId: 'name',
  dateColumnId: 'start_time',
  paramNames: {
    search: 'search',
    startDate: 'date_from',
    endDate: 'date_to',
  },
  defaultSorting: [{ id: 'start_time', desc: true }],
};

export function useStudioShows({ studioId }: UseStudioShowsProps) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  } = useTableUrlState(TABLE_OPTIONS);

  const searchQuery = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';
  const dateRange = (columnFilters.find((f) => f.id === 'start_time')?.value as { from?: Date; to?: Date }) || undefined;

  const filters = useMemo(() => {
    const f: Record<string, string | boolean | undefined> = {};
    columnFilters.forEach((filter) => {
      if (['client_name', 'show_type_name', 'show_standard_name', 'show_status_name', 'platform_name'].includes(filter.id)) {
        f[filter.id] = filter.value as string;
      }
      if (filter.id === 'has_tasks') {
        if (filter.value === true || filter.value === 'true') {
          f.has_tasks = true;
        } else if (filter.value === false || filter.value === 'false') {
          f.has_tasks = false;
        } else {
          f.has_tasks = undefined;
        }
      }
    });
    return f;
  }, [columnFilters]);

  const query = useQuery({
    queryKey: studioShowsKeys.list(studioId, {
      page: pagination.pageIndex,
      limit: pagination.pageSize,
      search: searchQuery,
      dateRange,
      ...filters,
    }),
    queryFn: () =>
      getStudioShows(studioId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: searchQuery || undefined,
        date_from: dateRange?.from?.toISOString(),
        date_to: dateRange?.to?.toISOString(),
        ...filters,
      }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data, isLoading, isFetching, isError } = query;

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  return {
    data,
    shows: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    isLoading,
    isFetching,
    isError,
    refetch: query.refetch,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  };
}
