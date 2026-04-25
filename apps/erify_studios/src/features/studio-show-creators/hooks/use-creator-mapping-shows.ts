import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { getStudioShows, studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { toShowScopeDateTimeBounds } from '@/features/studio-shows/utils/show-scope.utils';

type UseCreatorMappingShowsProps = {
  studioId: string;
  dateFrom?: string;
  dateTo?: string;
};

const TABLE_OPTIONS = {
  from: '/studios/$studioId/creator-mapping/',
  searchColumnId: 'name',
  paramNames: {
    search: 'search',
    startDate: 'date_from',
    endDate: 'date_to',
  },
};

export function useCreatorMappingShows({ studioId, dateFrom, dateTo }: UseCreatorMappingShowsProps) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState(TABLE_OPTIONS);

  const searchQuery = (columnFilters.find((filter) => filter.id === 'name')?.value as string) || '';
  const filters = useMemo(() => {
    const nextFilters: {
      has_creators?: boolean;
      creator_name?: string;
      show_status_name?: string;
    } = {};

    columnFilters.forEach((filter) => {
      if (filter.id === 'creator_name') {
        nextFilters.creator_name = (filter.value as string) || undefined;
      }

      if (filter.id === 'show_status_name') {
        nextFilters.show_status_name = (filter.value as string) || undefined;
      }

      if (filter.id === 'has_creators') {
        if (filter.value === true || filter.value === 'true') {
          nextFilters.has_creators = true;
        } else if (filter.value === false || filter.value === 'false') {
          nextFilters.has_creators = false;
        } else {
          nextFilters.has_creators = undefined;
        }
      }
    });

    return nextFilters;
  }, [columnFilters]);
  const scopeDateBounds = useMemo(
    () => toShowScopeDateTimeBounds({ dateFrom, dateTo }),
    [dateFrom, dateTo],
  );

  const query = useQuery({
    queryKey: studioShowsKeys.list(studioId, {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: searchQuery,
      date_from: scopeDateBounds.date_from,
      date_to: scopeDateBounds.date_to,
      ...filters,
    }),
    queryFn: ({ signal }) =>
      getStudioShows(studioId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: searchQuery || undefined,
        date_from: scopeDateBounds.date_from,
        date_to: scopeDateBounds.date_to,
        ...filters,
      }, { signal }),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (query.data?.meta?.totalPages !== undefined) {
      setPageCount(query.data.meta.totalPages);
    }
  }, [query.data?.meta?.totalPages, setPageCount]);

  const tablePagination = query.data?.meta
    ? {
        pageIndex: query.data.meta.page - 1,
        pageSize: query.data.meta.limit,
        total: query.data.meta.total,
        pageCount: query.data.meta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  return {
    data: query.data,
    shows: query.data?.data ?? [],
    total: tablePagination.total,
    pageCount: tablePagination.pageCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    pagination: tablePagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
  };
}
