import { useQueryClient } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { useEffect } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  TASK_STATUS,
  TASK_TYPE,
  type TaskStatus,
  type TaskType,
} from '@eridu/api-types/task-management';
import { useTableUrlState } from '@eridu/ui';

import { useAdminTasksQuery } from '@/features/tasks/api/get-admin-tasks';

const VALID_STATUS = new Set(Object.values(TASK_STATUS));
const VALID_TASK_TYPES = new Set(Object.values(TASK_TYPE));

export function useAdminTasks() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/tasks/',
    searchColumnId: 'description',
    dateColumnId: 'due_date',
    paramNames: {
      search: 'description',
      startDate: 'due_date_from',
      endDate: 'due_date_to',
    },
  });

  const search = columnFilters.find((filter) => filter.id === 'description')
    ?.value as string | undefined;
  const studioName = columnFilters.find((filter) => filter.id === 'studio_name')
    ?.value as string | undefined;
  const clientName = columnFilters.find((filter) => filter.id === 'client_name')
    ?.value as string | undefined;
  const assigneeName = columnFilters.find((filter) => filter.id === 'assignee_name')
    ?.value as string | undefined;
  const showName = columnFilters.find((filter) => filter.id === 'show_name')
    ?.value as string | undefined;
  const hasAssigneeValue = columnFilters.find((filter) => filter.id === 'has_assignee')
    ?.value as string | undefined;
  const hasDueDateValue = columnFilters.find((filter) => filter.id === 'has_due_date')
    ?.value as string | undefined;
  const dueDateRange = columnFilters.find((filter) => filter.id === 'due_date')
    ?.value as DateRange | undefined;
  const statusValue = columnFilters.find((filter) => filter.id === 'status')
    ?.value as string | undefined;
  const taskTypeValue = columnFilters.find((filter) => filter.id === 'task_type')
    ?.value as string | undefined;

  const status = statusValue && VALID_STATUS.has(statusValue as TaskStatus)
    ? (statusValue as TaskStatus)
    : undefined;
  const taskType = taskTypeValue && VALID_TASK_TYPES.has(taskTypeValue as TaskType)
    ? (taskTypeValue as TaskType)
    : undefined;
  const hasAssignee = hasAssigneeValue === 'true'
    ? true
    : hasAssigneeValue === 'false'
      ? false
      : undefined;
  const hasDueDate = hasDueDateValue === 'true'
    ? true
    : hasDueDateValue === 'false'
      ? false
      : undefined;

  const { data, isLoading, isFetching } = useAdminTasksQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    studio_name: studioName,
    client_name: clientName,
    assignee_name: assigneeName,
    show_name: showName,
    has_assignee: hasAssignee,
    has_due_date: hasDueDate,
    due_date_from: dueDateRange?.from ? startOfDay(dueDateRange.from).toISOString() : undefined,
    due_date_to: dueDateRange?.to ? endOfDay(dueDateRange.to).toISOString() : undefined,
    status,
    task_type: taskType,
    sort: 'due_date:asc',
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
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
