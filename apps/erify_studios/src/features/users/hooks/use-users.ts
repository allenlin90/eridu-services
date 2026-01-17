import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type {
  createUserInputSchema,
  updateUserInputSchema,
  UserApiResponse,
} from '@eridu/api-types/users';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type User = UserApiResponse;
type UserFormData = z.infer<typeof createUserInputSchema>;
type UpdateUserFormData = z.infer<typeof updateUserInputSchema>;

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

  const { data, isLoading, isFetching } = useAdminList<User>('users', {
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

  const createMutation = useAdminCreate<User, UserFormData>('users');
  const updateMutation = useAdminUpdate<User, UpdateUserFormData>('users');
  const deleteMutation = useAdminDelete('users');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('users'),
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
