import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  TASK_STATUS,
  TASK_TYPE,
  type TaskStatus,
  type TaskType,
} from '@eridu/api-types/task-management';
import { useTableUrlState } from '@eridu/ui';

import { getStudioTasks, studioTasksKeys } from '@/features/tasks/api/get-studio-tasks';

const VALID_STATUS = new Set(Object.values(TASK_STATUS));
const VALID_TASK_TYPES = new Set(Object.values(TASK_TYPE));

type UseStudioTasksProps = {
  studioId: string;
};

function createTodayDateRange(): DateRange {
  const today = new Date();
  return {
    from: startOfDay(today),
    to: endOfDay(today),
  };
}

export function useStudioTasks({ studioId }: UseStudioTasksProps) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/task-review',
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
  const defaultDueDateRange = useMemo(() => createTodayDateRange(), []);
  const effectiveDueDateRange = dueDateRange ?? defaultDueDateRange;
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

  const params = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    client_name: clientName,
    assignee_name: assigneeName,
    show_name: showName,
    has_assignee: hasAssignee,
    has_due_date: hasDueDate,
    due_date_from: effectiveDueDateRange.from ? startOfDay(effectiveDueDateRange.from).toISOString() : undefined,
    due_date_to: effectiveDueDateRange.to ? endOfDay(effectiveDueDateRange.to).toISOString() : undefined,
    status,
    task_type: taskType,
    sort: 'due_date:asc',
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: studioTasksKeys.list(studioId, params),
    queryFn: ({ signal }) => getStudioTasks(studioId, params, { signal }),
    enabled: !!studioId,
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: studioTasksKeys.all(studioId) });
  };
  const handleDueDateRangeChange = useCallback((nextRange: DateRange | undefined) => {
    const fallbackRange = createTodayDateRange();
    const fromDate = nextRange?.from ?? nextRange?.to ?? fallbackRange.from;
    const toDate = nextRange?.to ?? nextRange?.from ?? fallbackRange.to;

    onColumnFiltersChange((previousFilters) => [
      ...previousFilters.filter((filter) => filter.id !== 'due_date'),
      {
        id: 'due_date',
        value: {
          from: fromDate,
          to: toDate,
        },
      },
    ]);
  }, [onColumnFiltersChange]);
  const handleResetDueDateRange = useCallback(() => {
    handleDueDateRangeChange(createTodayDateRange());
  }, [handleDueDateRangeChange]);

  return {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    dueDateRange: effectiveDueDateRange,
    onDueDateRangeChange: handleDueDateRangeChange,
    onDueDateRangeReset: handleResetDueDateRange,
    handleRefresh,
  };
}
