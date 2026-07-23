import type { ColumnFiltersState, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type { BulkApproveTasksResponse, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { adaptColumnFiltersChange } from '@eridu/ui';

import type { TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import { useBulkApproveTasks } from '@/features/tasks/hooks/use-bulk-approve-tasks';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';
import { useTaskReviewSearchableColumns } from '@/features/tasks/hooks/use-task-review-searchable-columns';
import { useTaskReviewSummary } from '@/features/tasks/hooks/use-task-review-summary';

/** Owns task-review URL/table state and keeps the route focused on composition. */
export function useTaskReviewPage(studioId: string, canManage: boolean) {
  const [activeFilter, setActiveFilter] = useState<TaskReviewActiveFilter>('all');
  const [qcReviewTask, setQcReviewTask] = useState<TaskWithRelationsDto | null>(null);
  const [resultsData, setResultsData] = useState<BulkApproveTasksResponse | null>(null);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const handleOpenQcReview = useCallback((task: TaskWithRelationsDto) => setQcReviewTask(task), []);
  const controller = useStudioTasksPageController({
    studioId,
    reviewTab: activeFilter,
    canManage,
    onOpenQcReview: handleOpenQcReview,
  });
  const { tableProps, reviewScopeProps } = controller;
  const { columnFilters, onColumnFiltersChange, onPaginationChange, pagination } = tableProps;
  const { dateRange, onDateRangeChange, onResetDateRange } = reviewScopeProps;
  const searchableColumns = useTaskReviewSearchableColumns(studioId, columnFilters);
  const summary = useTaskReviewSummary({ studioId, dateRange });
  const { mutate: bulkApprove, isPending: isApproving } = useBulkApproveTasks({
    studioId,
    onSuccess: (response) => {
      setResultsData(response);
      setIsResultsDialogOpen(true);
      setRowSelection({});
    },
  });

  const handleActiveFilterChange = useCallback((filter: TaskReviewActiveFilter) => {
    setActiveFilter(filter);
    setRowSelection({});
    onPaginationChange({ pageIndex: 0, pageSize: pagination.pageSize });
  }, [onPaginationChange, pagination.pageSize]);
  const handleDateRangeChange = useCallback((dateRange: DateRange | undefined) => {
    onDateRangeChange(dateRange);
    setRowSelection({});
  }, [onDateRangeChange]);
  const handleResetDateRange = useCallback(() => {
    onResetDateRange();
    setRowSelection({});
  }, [onResetDateRange]);
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback((updaterOrValue) => {
    const adapter = adaptColumnFiltersChange(columnFilters, (nextFilters) => {
      onColumnFiltersChange(nextFilters);
      setRowSelection({});
    });
    adapter?.(updaterOrValue);
  }, [columnFilters, onColumnFiltersChange]);
  const selectedTaskUids = useMemo(() => Object.entries(rowSelection)
    .filter(([, isSelected]) => isSelected)
    .map(([taskId]) => taskId), [rowSelection]);

  return {
    ...controller,
    activeFilter,
    qcReviewTask,
    setQcReviewTask,
    resultsData,
    isResultsDialogOpen,
    setIsResultsDialogOpen,
    rowSelection,
    setRowSelection,
    searchableColumns,
    stats: summary.stats,
    isSummaryFetching: summary.isFetching,
    bulkApprove,
    isApproving,
    selectedTaskUids,
    handleActiveFilterChange,
    handleDateRangeChange,
    handleResetDateRange,
    handleColumnFiltersChange,
  };
}
