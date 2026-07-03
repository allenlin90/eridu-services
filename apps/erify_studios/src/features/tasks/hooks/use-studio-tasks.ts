import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  TASK_STATUS,
  TASK_TYPE,
  type TaskStatus,
  type TaskType,
} from '@eridu/api-types/task-management';
import { useTableUrlState } from '@eridu/ui';

import {
  getStudioTasks,
  type GetStudioTasksParams,
  studioTasksKeys,
} from '@/features/tasks/api/get-studio-tasks';
import type { TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import {
  buildOperationalDayRangeFromPickerDates,
  isCurrentOperationalDay,
  OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS,
  operationalDayRangeToPickerDates,
  operationalWindowToDayRange,
} from '@/lib/operational-day-range';

const VALID_STATUS = new Set(Object.values(TASK_STATUS));
const VALID_TASK_TYPES = new Set(Object.values(TASK_TYPE));

type UseStudioTasksProps = {
  studioId: string;
  reviewTab?: TaskReviewActiveFilter;
};

export function useStudioTasks({ studioId, reviewTab }: UseStudioTasksProps) {
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
  const dueDateWindow = columnFilters.find((filter) => filter.id === 'due_date')
    ?.value as DateRange | undefined;
  const effectiveOperationalDayRange = useMemo(
    () => operationalWindowToDayRange(dueDateWindow),
    [dueDateWindow],
  );
  const dueDateRange = useMemo(
    () => operationalDayRangeToPickerDates(effectiveOperationalDayRange),
    [effectiveOperationalDayRange],
  );
  const isViewingCurrentOperationalDay = isCurrentOperationalDay(effectiveOperationalDayRange);
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

  const params: GetStudioTasksParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    client_name: clientName,
    assignee_name: assigneeName,
    show_name: showName,
    has_assignee: hasAssignee,
    has_due_date: hasDueDate,
    due_date_from: effectiveOperationalDayRange.windowStart.toISOString(),
    due_date_to: effectiveOperationalDayRange.windowEnd.toISOString(),
    status,
    task_type: taskType,
    sort: 'due_date:asc',
    review_tab: reviewTab,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: studioTasksKeys.list(studioId, params),
    queryFn: ({ signal }) => getStudioTasks(studioId, params, { signal }),
    enabled: !!studioId,
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchInterval: isViewingCurrentOperationalDay
      ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: false,
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
    onColumnFiltersChange((previousFilters) => [
      ...previousFilters.filter((filter) => filter.id !== 'due_date'),
      {
        id: 'due_date',
        value: nextRange
          ? {
              from: nextRange.from,
              to: nextRange.to,
            }
          : undefined,
      },
    ]);
  }, [onColumnFiltersChange]);
  const handleResetDueDateRange = useCallback(() => {
    const freshRange = buildOperationalDayRangeFromPickerDates(undefined, undefined);
    onColumnFiltersChange((previousFilters) => [
      ...previousFilters.filter((filter) => filter.id !== 'due_date'),
      {
        id: 'due_date',
        value: {
          from: freshRange.windowStart,
          to: freshRange.windowEnd,
        },
      },
    ]);
  }, [onColumnFiltersChange]);

  return {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    dueDateRange,
    onDueDateRangeChange: handleDueDateRangeChange,
    onDueDateRangeReset: handleResetDueDateRange,
    handleRefresh,
  };
}
