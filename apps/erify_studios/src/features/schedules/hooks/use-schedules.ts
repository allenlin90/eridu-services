import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useDeleteSchedule } from '@/features/schedules/api/delete-schedule';
import { useSchedulesQuery } from '@/features/schedules/api/get-schedules';
import { useUpdateSchedule } from '@/features/schedules/api/update-schedule';

type UseSchedulesParams = {
  name?: string;
  client_name?: string;
  id?: string;
};

export function useSchedules(params: UseSchedulesParams) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/admin/schedules/',
    paramNames: {
      search: 'name',
    },
  });

  const { data, isLoading, isFetching } = useSchedulesQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...params,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['schedules'],
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
    updateMutation,
    deleteMutation,
    handleRefresh,
  };
}
