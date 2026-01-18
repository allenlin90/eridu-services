import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateUser } from '@/features/users/api/create-user';
import { useDeleteUser } from '@/features/users/api/delete-user';
import { useUsersQuery } from '@/features/users/api/get-users';
import { useUpdateUser } from '@/features/users/api/update-user';

export function useUsers() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/users/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const emailFilter = columnFilters.find((filter) => filter.id === 'email')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;
  const extIdFilter = columnFilters.find((filter) => filter.id === 'ext_id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useUsersQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    email: emailFilter,
    id: idFilter,
    ext_id: extIdFilter,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['users'],
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
