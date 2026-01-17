import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type {
  createShowStandardInputSchema,
  ShowStandardApiResponse,
  updateShowStandardInputSchema,
} from '@eridu/api-types/show-standards';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type ShowStandard = ShowStandardApiResponse;
type ShowStandardFormData = z.infer<typeof createShowStandardInputSchema>;
type UpdateShowStandardFormData = z.infer<typeof updateShowStandardInputSchema>;

export function useShowStandards() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/show-standards/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useAdminList<ShowStandard>('show-standards', {
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

  const createMutation = useAdminCreate<ShowStandard, ShowStandardFormData>('show-standards');
  const updateMutation = useAdminUpdate<ShowStandard, UpdateShowStandardFormData>('show-standards');
  const deleteMutation = useAdminDelete('show-standards');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('show-standards'),
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
