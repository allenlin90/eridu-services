import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { TASK_TYPE, type TaskType } from '@eridu/api-types/task-management';
import { useTableUrlState } from '@eridu/ui';

import { useAdminTaskTemplatesQuery } from '../api/get-admin-task-templates';

const VALID_TASK_TYPES = new Set(Object.values(TASK_TYPE));

export function useAdminTaskTemplates() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/task-templates/',
    searchColumnId: 'name',
  });

  const search = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const studioName = columnFilters.find((filter) => filter.id === 'studio_name')
    ?.value as string | undefined;
  const taskTypeValue = columnFilters.find((filter) => filter.id === 'task_type')
    ?.value as string | undefined;
  const isActiveValue = columnFilters.find((filter) => filter.id === 'is_active')
    ?.value as string | undefined;

  const taskType = taskTypeValue && VALID_TASK_TYPES.has(taskTypeValue as TaskType)
    ? (taskTypeValue as TaskType)
    : undefined;
  const isActive = isActiveValue === 'true'
    ? true
    : isActiveValue === 'false'
      ? false
      : undefined;

  const { data, isLoading, isFetching } = useAdminTaskTemplatesQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    studio_name: studioName,
    task_type: taskType,
    is_active: isActive,
    sort: 'updated_at:desc',
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] });
  };

  return {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  };
}
