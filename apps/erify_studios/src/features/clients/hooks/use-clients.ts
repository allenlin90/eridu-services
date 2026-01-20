import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateClient } from '@/features/clients/api/create-client';
import { useDeleteClient } from '@/features/clients/api/delete-client';
import { useClientsQuery } from '@/features/clients/api/get-clients';
import { useUpdateClient } from '@/features/clients/api/update-client';

export function useClients() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/clients/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useClientsQuery({
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

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['clients'],
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
