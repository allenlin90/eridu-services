import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { getStudioShows, studioShowsKeys } from '../api/get-studio-shows';

const ORPHAN_SCHEDULE_TERMS = new Set(['orphan', 'orphans', 'unassigned']);

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

export function useStudioShowManagement(studioId: string) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  } = useTableUrlState(TABLE_OPTIONS);

  const search = (columnFilters.find((filter) => filter.id === 'name')?.value as string) || '';
  const filters = useMemo(() => {
    const nextFilters: Record<string, string | undefined> = {};

    columnFilters.forEach((filter) => {
      if ([
        'schedule_name',
        'client_name',
        'creator_name',
        'show_type_name',
        'show_standard_name',
        'show_status_name',
        'platform_name',
        'has_schedule',
      ].includes(filter.id)) {
        nextFilters[filter.id] = filter.value as string;
      }
    });

    return nextFilters;
  }, [columnFilters]);
  const normalizedScheduleFilter = filters.schedule_name?.trim().toLowerCase();
  const isOrphanScheduleFilter = normalizedScheduleFilter
    ? ORPHAN_SCHEDULE_TERMS.has(normalizedScheduleFilter)
    : false;
  const effectiveScheduleName = isOrphanScheduleFilter ? undefined : filters.schedule_name;
  const effectiveHasSchedule = isOrphanScheduleFilter ? 'false' : filters.has_schedule;
  const dateRange = columnFilters.find((filter) => filter.id === 'start_time')?.value as
    | { from?: string; to?: string }
    | undefined;

  const query = useQuery({
    queryKey: studioShowsKeys.list(studioId, {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search,
      schedule_name: effectiveScheduleName,
      date_from: dateRange?.from,
      date_to: dateRange?.to,
      client_name: filters.client_name,
      creator_name: filters.creator_name,
      show_type_name: filters.show_type_name,
      show_standard_name: filters.show_standard_name,
      show_status_name: filters.show_status_name,
      platform_name: filters.platform_name,
      has_schedule: effectiveHasSchedule,
    }),
    queryFn: ({ signal }) => getStudioShows(studioId, {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: search || undefined,
      schedule_name: effectiveScheduleName,
      date_from: dateRange?.from,
      date_to: dateRange?.to,
      has_schedule: isOrphanScheduleFilter
        ? false
        : filters.has_schedule === undefined
          ? undefined
          : filters.has_schedule === 'true',
      creator_name: filters.creator_name,
      client_name: filters.client_name,
      show_type_name: filters.show_type_name,
      show_standard_name: filters.show_standard_name,
      show_status_name: filters.show_status_name,
      platform_name: filters.platform_name,
    }, { signal }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data?.meta.totalPages !== undefined) {
      setPageCount(query.data.meta.totalPages);
    }
  }, [query.data?.meta.totalPages, setPageCount]);

  return {
    data: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  };
}
