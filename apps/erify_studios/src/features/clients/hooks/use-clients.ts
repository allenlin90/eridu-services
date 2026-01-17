import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type {
  ClientApiResponse,
  createClientInputSchema,
  updateClientInputSchema,
} from '@eridu/api-types/clients';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type Client = ClientApiResponse;
type ClientFormData = z.infer<typeof createClientInputSchema>;
type UpdateClientFormData = z.infer<typeof updateClientInputSchema>;

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

  const { data, isLoading, isFetching } = useAdminList<Client>('clients', {
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

  const createMutation = useAdminCreate<Client, ClientFormData>('clients');
  const updateMutation = useAdminUpdate<Client, UpdateClientFormData>('clients');
  const deleteMutation = useAdminDelete('clients');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('clients'),
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
