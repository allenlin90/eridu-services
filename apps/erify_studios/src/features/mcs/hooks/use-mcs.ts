import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateMc } from '@/features/mcs/api/create-mc';
import { useDeleteMc } from '@/features/mcs/api/delete-mc';
import { useMcsQuery } from '@/features/mcs/api/get-mcs';
import { useUpdateMc } from '@/features/mcs/api/update-mc';

export function useMcs() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/mcs/',
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

  const { data, isLoading, isFetching } = useMcsQuery({
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

  const createMutation = useCreateMc();
  const updateMutation = useUpdateMc();
  const deleteMutation = useDeleteMc();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['mcs'],
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
