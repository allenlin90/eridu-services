import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateShowStatus } from '@/features/show-statuses/api/create-show-status';
import { useDeleteShowStatus } from '@/features/show-statuses/api/delete-show-status';
import { useShowStatusesQuery } from '@/features/show-statuses/api/get-show-statuses';
import { useUpdateShowStatus } from '@/features/show-statuses/api/update-show-status';

export function useShowStatuses() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/show-statuses/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useShowStatusesQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    id: idFilter,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateShowStatus();
  const updateMutation = useUpdateShowStatus();
  const deleteMutation = useDeleteShowStatus();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['show-statuses'],
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
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  };
}
