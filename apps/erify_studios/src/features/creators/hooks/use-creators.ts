import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateCreator } from '@/features/creators/api/create-creator';
import { useDeleteCreator } from '@/features/creators/api/delete-creator';
import { useCreatorsQuery } from '@/features/creators/api/get-creators';
import { useUpdateCreator } from '@/features/creators/api/update-creator';

export function useCreators() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/creators/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const aliasNameFilter = columnFilters.find((filter) => filter.id === 'alias_name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useCreatorsQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    alias_name: aliasNameFilter,
    id: idFilter,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateCreator();
  const updateMutation = useUpdateCreator();
  const deleteMutation = useDeleteCreator();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['creators'],
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
