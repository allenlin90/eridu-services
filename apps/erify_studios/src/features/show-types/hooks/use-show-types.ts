import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type {
  CreateShowTypeInput,
  ShowTypeApiResponse,
  UpdateShowTypeInput,
} from '@eridu/api-types/show-types';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type ShowType = ShowTypeApiResponse;

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

  const { data, isLoading, isFetching } = useAdminList<ShowType>('show-types', {
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

  const createMutation = useAdminCreate<ShowType, CreateShowTypeInput>('show-types');
  const updateMutation = useAdminUpdate<ShowType, UpdateShowTypeInput>('show-types');
  const deleteMutation = useAdminDelete('show-types');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('show-types'),
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
