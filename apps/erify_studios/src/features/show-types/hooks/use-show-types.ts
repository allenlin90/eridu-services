import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateShowType } from '@/features/show-types/api/create-show-type';
import { useDeleteShowType } from '@/features/show-types/api/delete-show-type';
import { useShowTypesQuery } from '@/features/show-types/api/get-show-types';
import { useUpdateShowType } from '@/features/show-types/api/update-show-type';

export function useShowTypes() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/show-types/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useShowTypesQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    id: idFilter,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateShowType();
  const updateMutation = useUpdateShowType();
  const deleteMutation = useDeleteShowType();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['show-types'],
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
