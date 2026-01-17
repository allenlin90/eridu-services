import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';
import { useTableUrlState } from '@eridu/ui';

import type { Show } from '@/features/shows/config/show-columns';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type UpdateShowFormData = z.infer<typeof updateShowInputSchema>;

type UseShowsParams = {
  name?: string;
  client_name?: string;
  mc_name?: string;
  start_date_from?: string;
  start_date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  id?: string;
};

const TABLE_OPTIONS = {
  from: '/admin/shows/',
  dateColumnId: 'start_time',
  paramNames: {
    search: 'name',
    startDate: 'start_date_from',
    endDate: 'start_date_to',
  },
  defaultSorting: [{ id: 'start_time', desc: true }],
};

export function useShows(params: UseShowsParams) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  } = useTableUrlState(TABLE_OPTIONS);

  const { data, isLoading, isFetching } = useAdminList<Show>('shows', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: params.name,
    client_name: params.client_name,
    mc_name: params.mc_name,
    start_date_from: params.start_date_from,
    start_date_to: params.start_date_to,
    order_by: params.sortBy,
    order_direction: params.sortOrder,
    id: params.id,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const updateMutation = useAdminUpdate<Show, UpdateShowFormData>('shows');
  const deleteMutation = useAdminDelete('shows');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('shows'),
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
    sorting,
    onSortingChange,
    updateMutation,
    deleteMutation,
    handleRefresh,
  };
}
