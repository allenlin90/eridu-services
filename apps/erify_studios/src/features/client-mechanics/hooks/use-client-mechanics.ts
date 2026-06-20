import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateClientMechanic } from '../api/create-client-mechanic';
import { useDeleteClientMechanic } from '../api/delete-client-mechanic';
import { useClientMechanicsQuery } from '../api/get-client-mechanics';
import { useUpdateClientMechanic } from '../api/update-client-mechanic';

type UseClientMechanicsProps = {
  studioId: string;
  clientId?: string;
};

export function useClientMechanics({ studioId, clientId }: UseClientMechanicsProps) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/client-mechanics',
    searchColumnId: 'title',
    defaultSorting: [{ id: 'created_at', desc: true }],
  });

  const search = columnFilters.find((filter) => filter.id === 'title')?.value as string | undefined;
  const status = columnFilters.find((filter) => filter.id === 'status')?.value as 'active' | 'retired' | undefined;

  const { data, isLoading, isFetching } = useClientMechanicsQuery(
    studioId,
    clientId,
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search,
      status,
    },
  );

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateClientMechanic(studioId, clientId || '');
  const updateMutation = useUpdateClientMechanic(studioId, clientId || '');
  const deleteMutation = useDeleteClientMechanic(studioId, clientId || '');

  const handleRefresh = useCallback(() => {
    if (clientId) {
      void queryClient.invalidateQueries({
        queryKey: ['client-mechanics', 'list', studioId, clientId],
      });
    }
  }, [clientId, queryClient, studioId]);

  return {
    data: data?.data || [],
    isLoading,
    isFetching,
    pagination: data?.meta
      ? {
          pageIndex: data.meta.page - 1,
          pageSize: data.meta.limit,
          total: data.meta.total,
          pageCount: data.meta.totalPages,
        }
      : {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: 0,
          pageCount: 0,
        },
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  };
}
