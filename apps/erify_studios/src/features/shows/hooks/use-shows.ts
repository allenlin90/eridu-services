import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useDeleteShow } from '@/features/shows/api/delete-show';
import { useShowsQuery } from '@/features/shows/api/get-shows';
import { useUpdateShow } from '@/features/shows/api/update-show';

type UseShowsParams = {
  name?: string;
  client_name?: string;
  mc_name?: string;
  start_date_from?: string;
  start_date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  id?: string;
};

const TABLE_OPTIONS = {
  from: '/admin/shows/',
  dateColumnId: 'start_time',
  paramNames: {
    search: 'name',
    startDate: 'start_date_from',
    endDate: 'start_date_to',
  },
  defaultSorting: [{ id: 'start_time', desc: true }],
};

export function useShows(params: UseShowsParams) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  } = useTableUrlState(TABLE_OPTIONS);

  const { data, isLoading, isFetching } = useShowsQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...params,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const updateMutation = useUpdateShow();
  const deleteMutation = useDeleteShow();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['shows'],
    });
  };

  return {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    updateMutation,
    deleteMutation,
    handleRefresh,
  };
}
