import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreatePlatform } from '@/features/platforms/api/create-platform';
import { useDeletePlatform } from '@/features/platforms/api/delete-platform';
import { usePlatformsQuery } from '@/features/platforms/api/get-platforms';
import { useUpdatePlatform } from '@/features/platforms/api/update-platform';

export function usePlatforms() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/platforms/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = usePlatformsQuery({
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

  const createMutation = useCreatePlatform();
  const updateMutation = useUpdatePlatform();
  const deleteMutation = useDeletePlatform();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['platforms'],
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
