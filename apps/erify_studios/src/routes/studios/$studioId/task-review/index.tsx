import { createFileRoute } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { BulkApproveTasksResponse } from '@eridu/api-types/task-management';
import {
  adaptColumnFiltersChange,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DatePickerWithRange,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { BulkApproveResultsDialog } from '@/features/tasks/components/bulk-approve-results-dialog';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { StudioTaskReviewFilterTabs } from '@/features/tasks/components/studio-task-review-filter-tabs';
import { StudioTaskReviewSummaryPanel, type TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { getTaskIssues, studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useBulkApproveTasks } from '@/features/tasks/hooks/use-bulk-approve-tasks';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';
import { useTaskReviewClientFilter } from '@/features/tasks/hooks/use-task-review-client-filter';
import { useTaskReviewShowFilter } from '@/features/tasks/hooks/use-task-review-show-filter';
import { useTaskReviewSummary } from '@/features/tasks/hooks/use-task-review-summary';
import { useTaskReviewUserFilter } from '@/features/tasks/hooks/use-task-review-user-filter';

export const Route = createFileRoute('/studios/$studioId/task-review/')({
  component: StudioTaskReviewPage,
});

function StudioTaskReviewPage() {
  const { studioId } = Route.useParams();
  // State for active filter tab (server-filtered)
  const [activeFilter, setActiveFilter] = useState<TaskReviewActiveFilter>('all');

  const { tableProps, toolbarProps, reviewScopeProps, actionSheetProps, dueDateDialogProps } = useStudioTasksPageController({
    studioId,
    reviewTab: activeFilter,
  });
  const { onPaginationChange, onColumnFiltersChange, columnFilters } = tableProps;
  const { onDateRangeChange, onResetDateRange } = reviewScopeProps;
  const { key: actionSheetKey, ...actionSheetRestProps } = actionSheetProps;
  const { key: dueDateDialogKey, ...dueDateDialogRestProps } = dueDateDialogProps;

  // Extract selected names from column filters to persist labels in the combobox triggers
  const selectedClientName = useMemo(() => {
    const filter = columnFilters.find((cf) => cf.id === 'client_name');
    return typeof filter?.value === 'string' && filter.value ? filter.value : undefined;
  }, [columnFilters]);

  const selectedAssigneeName = useMemo(() => {
    const filter = columnFilters.find((cf) => cf.id === 'assignee_name');
    return typeof filter?.value === 'string' && filter.value ? filter.value : undefined;
  }, [columnFilters]);

  const selectedShowName = useMemo(() => {
    const filter = columnFilters.find((cf) => cf.id === 'show_name');
    return typeof filter?.value === 'string' && filter.value ? filter.value : undefined;
  }, [columnFilters]);

  // Query options asynchronously for client, user, and show filters
  const {
    options: clientOptions,
    isLoading: isClientLoading,
    setSearch: setClientSearch,
  } = useTaskReviewClientFilter(studioId, selectedClientName);

  const {
    options: assigneeOptions,
    isLoading: isAssigneeLoading,
    setSearch: setAssigneeSearch,
  } = useTaskReviewUserFilter(studioId, selectedAssigneeName);

  const {
    options: showOptions,
    isLoading: isShowLoading,
    setSearch: setShowSearch,
  } = useTaskReviewShowFilter(studioId, selectedShowName);

  // Dynamically declare searchable columns to inject async combobox filters
  const searchableColumns = useMemo(() => {
    return studioTaskSearchableColumns
      .filter((column) => column.id !== 'due_date')
      .map((column) => {
        if (column.id === 'client_name') {
          return {
            ...column,
            type: 'combobox' as const,
            options: clientOptions,
            onSearch: setClientSearch,
            isLoading: isClientLoading,
            placeholder: 'Filter by client',
          };
        }
        if (column.id === 'assignee_name') {
          return {
            ...column,
            type: 'combobox' as const,
            options: assigneeOptions,
            onSearch: setAssigneeSearch,
            isLoading: isAssigneeLoading,
            placeholder: 'Filter by user',
          };
        }
        if (column.id === 'show_name') {
          return {
            ...column,
            type: 'combobox' as const,
            options: showOptions,
            onSearch: setShowSearch,
            isLoading: isShowLoading,
            placeholder: 'Filter by show',
          };
        }
        return column;
      });
  }, [
    clientOptions,
    isClientLoading,
    setClientSearch,
    assigneeOptions,
    isAssigneeLoading,
    setAssigneeSearch,
    showOptions,
    isShowLoading,
    setShowSearch,
  ]);

  // Load summary and statistics using extracted hook
  const { stats, isFetching: isSummaryFetching } = useTaskReviewSummary({
    studioId,
    dateRange: reviewScopeProps.dateRange,
  });

  // State for bulk approval results
  const [resultsData, setResultsData] = useState<BulkApproveTasksResponse | null>(null);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);

  // State for row selection in the table
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { mutate: bulkApprove, isPending: isApproving } = useBulkApproveTasks({
    studioId,
    onSuccess: (response) => {
      setResultsData(response);
      setIsResultsDialogOpen(true);
      setRowSelection({}); // Clear selection on successful approval
    },
  });

  // Handler to clear selection and reset pagination when changing active filter tabs
  const handleActiveFilterChange = useCallback((filter: TaskReviewActiveFilter) => {
    setActiveFilter(filter);
    setRowSelection({});
    onPaginationChange({ pageIndex: 0, pageSize: tableProps.pagination.pageSize });
  }, [onPaginationChange, tableProps.pagination.pageSize]);

  // Handlers to clear selection when review scope, date range, or column filters change
  const handleDateRangeChange = useCallback((dateRange: any) => {
    onDateRangeChange(dateRange);
    setRowSelection({});
  }, [onDateRangeChange]);

  const handleResetDateRange = useCallback(() => {
    onResetDateRange();
    setRowSelection({});
  }, [onResetDateRange]);

  const handleColumnFiltersChange = useCallback((updaterOrValue: any) => {
    const adapter = adaptColumnFiltersChange(columnFilters, (nextFilters) => {
      onColumnFiltersChange(nextFilters);
      setRowSelection({});
    });
    adapter(updaterOrValue);
  }, [columnFilters, onColumnFiltersChange]);

  // Compute selected task UIDs from selection state keys
  const selectedTaskUids = useMemo(() => {
    return Object.entries(rowSelection)
      .filter(([_, isSelected]) => isSelected)
      .map(([taskId]) => taskId);
  }, [rowSelection]);

  return (
    <PageLayout
      title="Task Review"
      description="Review submitted tasks and manage studio task actions."
    >
      <div className="space-y-6">
        {/* Date picker scope block */}
        <Card className="border-muted/60 dark:border-muted/30">
          <CardHeader className="gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Review Date</CardTitle>
              <CardDescription>
                Submitted tasks due in the selected operational day (06:00–05:59) are shown below.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full">
              <DatePickerWithRange
                className="sm:w-72"
                date={reviewScopeProps.dateRange}
                setDate={handleDateRangeChange}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDateRange}
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Visual Dashboard cards */}
        <StudioTaskReviewSummaryPanel
          stats={stats}
          activeFilter={activeFilter}
          setActiveFilter={handleActiveFilterChange}
        />

        {/* Toggle tabs for main table filter */}
        <StudioTaskReviewFilterTabs
          stats={stats}
          activeFilter={activeFilter}
          onFilterChange={handleActiveFilterChange}
        />

        {/* Data Table */}
        <DataTable
          data={tableProps.data}
          columns={tableProps.columns}
          isLoading={tableProps.isLoading}
          isFetching={tableProps.isFetching || isSummaryFetching}
          emptyMessage={tableProps.emptyMessage}
          manualPagination
          manualFiltering
          pageCount={tableProps.pagination.pageCount}
          paginationState={{
            pageIndex: tableProps.pagination.pageIndex,
            pageSize: tableProps.pagination.pageSize,
          }}
          onPaginationChange={tableProps.onPaginationChange}
          columnFilters={tableProps.columnFilters}
          onColumnFiltersChange={handleColumnFiltersChange}
          enableRowSelection={(row) => row.original.status === 'REVIEW' && getTaskIssues(row.original).length === 0}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(task) => task.id}
          renderToolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchableColumns={searchableColumns}
              searchColumn={tableProps.searchColumn}
              searchPlaceholder={tableProps.searchPlaceholder}
              featuredFilterColumns={['client_name', 'assignee_name', 'show_name', 'status', 'task_type']}
            >
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={toolbarProps.onRefresh}
                disabled={tableProps.isFetching}
                aria-label="Refresh tasks"
              >
                <RefreshCw className={`h-4 w-4 ${tableProps.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </DataTableToolbar>
          )}
          renderFooter={() => (
            <DataTablePagination
              pagination={tableProps.pagination}
              onPaginationChange={tableProps.onPaginationChange}
            />
          )}
        />

        {/* Floating actions bar for selected tasks */}
        {selectedTaskUids.length > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-muted bg-slate-900 dark:bg-slate-950 px-6 py-3 text-slate-50 shadow-xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-4 dark:border-slate-800">
              <span className="text-sm font-medium">
                {selectedTaskUids.length}
                {' '}
                task
                {selectedTaskUids.length > 1 ? 's' : ''}
                {' '}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full px-4 animate-in fade-in duration-200"
                onClick={() => bulkApprove(selectedTaskUids)}
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve Selected'}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                className="rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setRowSelection({})}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <BulkApproveResultsDialog
          results={resultsData}
          open={isResultsDialogOpen}
          onOpenChange={setIsResultsDialogOpen}
        />

        <StudioTaskActionSheet key={actionSheetKey} {...actionSheetRestProps} />

        <TaskDueDateDialog key={dueDateDialogKey} {...dueDateDialogRestProps} />
      </div>
    </PageLayout>
  );
}
