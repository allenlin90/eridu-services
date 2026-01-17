import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type { ScheduleApiResponse, updateScheduleInputSchema } from '@eridu/api-types/schedules';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type Schedule = ScheduleApiResponse;
type UpdateScheduleFormData = z.infer<typeof updateScheduleInputSchema>;

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

  const { data, isLoading, isFetching } = useAdminList<Schedule>('schedules', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: params.name,
    client_name: params.client_name,
    id: params.id,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const updateMutation = useAdminUpdate<Schedule, UpdateScheduleFormData>('schedules');
  const deleteMutation = useAdminDelete('schedules');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('schedules'),
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
