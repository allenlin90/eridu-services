import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BulkApproveTasksResponse, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
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
import { StudioTaskReviewSummaryPanel, type TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { getTaskIssues, getTaskPhase, studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useBulkApproveTasks } from '@/features/tasks/hooks/use-bulk-approve-tasks';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';
import { useTaskReviewSummary } from '@/features/tasks/hooks/use-task-review-summary';

export const Route = createFileRoute('/studios/$studioId/task-review/')({
  component: StudioTaskReviewPage,
});

const taskReviewSearchableColumns = studioTaskSearchableColumns.filter((column) => column.id !== 'due_date');

function StudioTaskReviewPage() {
  const { studioId } = Route.useParams();
  const { tableProps, toolbarProps, reviewScopeProps, actionSheetProps, dueDateDialogProps, setPageCount } = useStudioTasksPageController({
    studioId,
  });
  const { onPaginationChange } = tableProps;
  const { key: actionSheetKey, ...actionSheetRestProps } = actionSheetProps;
  const { key: dueDateDialogKey, ...dueDateDialogRestProps } = dueDateDialogProps;

  // State for client-side filter
  const [activeFilter, setActiveFilter] = useState<TaskReviewActiveFilter>('all');

  // Load summary and statistics using extracted hook
  const { summaryData, stats, isFetching: isSummaryFetching } = useTaskReviewSummary({
    studioId,
    dateRange: reviewScopeProps.dateRange,
  });

  // State for bulk approval results
  const [resultsData, setResultsData] = useState<BulkApproveTasksResponse | null>(null);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);

  const { mutate: bulkApprove, isPending: isApproving } = useBulkApproveTasks({
    studioId,
    onSuccess: (response) => {
      setResultsData(response);
      setIsResultsDialogOpen(true);
    },
  });

  // Compute ready tasks client-side
  const readyTaskUids = useMemo(() => {
    return (summaryData?.data || [])
      .filter((task) => task.status === 'REVIEW' && getTaskIssues(task).length === 0)
      .map((task) => task.id);
  }, [summaryData?.data]);

  // Get pagination parameters from tableProps
  const { pageIndex, pageSize } = tableProps.pagination;

  // Helper to check if a task matches all active column filters client-side
  const matchesColumnFilters = useCallback((task: TaskWithRelationsDto, filters: { id: string; value: unknown }[]) => {
    return filters.every((filter) => {
      const { id, value } = filter;
      if (!value)
        return true;

      if (id === 'description') {
        const query = String(value).toLowerCase();
        const desc = (task.description || '').toLowerCase();
        const show = (task.show?.name || '').toLowerCase();
        const assignee = (task.assignee?.name || '').toLowerCase();
        return desc.includes(query) || show.includes(query) || assignee.includes(query);
      }
      if (id === 'client_name') {
        const query = String(value).toLowerCase();
        const client = (task.show?.client_name || '').toLowerCase();
        return client.includes(query);
      }
      if (id === 'assignee_name') {
        const query = String(value).toLowerCase();
        const assignee = (task.assignee?.name || '').toLowerCase();
        return assignee.includes(query);
      }
      if (id === 'show_name') {
        const query = String(value).toLowerCase();
        const show = (task.show?.name || '').toLowerCase();
        return show.includes(query);
      }
      if (id === 'status') {
        return task.status === value;
      }
      if (id === 'task_type') {
        return task.type === value;
      }
      if (id === 'has_assignee') {
        const isAssigned = !!task.assignee;
        if (value === 'true')
          return isAssigned;
        if (value === 'false')
          return !isAssigned;
        return true;
      }
      if (id === 'has_due_date') {
        const hasDate = !!task.due_date;
        if (value === 'true')
          return hasDate;
        if (value === 'false')
          return !hasDate;
        return true;
      }
      return true;
    });
  }, []);

  // Client-side table data filtering on the fully fetched summaryData dataset.
  // All tabs (including 'all') source from summaryData so dated + undated review
  // tasks form a single consistent partition across the tabs.
  const filteredAllData = useMemo(() => {
    const allReviewTasks = (summaryData?.data || []).filter(
      (task) => task.status === 'REVIEW' && matchesColumnFilters(task, tableProps.columnFilters),
    );
    if (activeFilter === 'all') {
      return allReviewTasks;
    }
    if (activeFilter === 'ready') {
      return allReviewTasks.filter((task) => getTaskIssues(task).length === 0);
    }
    if (activeFilter === 'attention') {
      return allReviewTasks.filter((task) => getTaskIssues(task).length > 0);
    }
    if (activeFilter === 'pre-prod-attention') {
      return allReviewTasks.filter(
        (task) => getTaskPhase(task.type) === 'pre-production' && getTaskIssues(task).length > 0,
      );
    }
    if (activeFilter === 'on-air-attention') {
      return allReviewTasks.filter(
        (task) => getTaskPhase(task.type) === 'on-air' && getTaskIssues(task).length > 0,
      );
    }
    if (activeFilter === 'post-prod-attention') {
      return allReviewTasks.filter(
        (task) => getTaskPhase(task.type) === 'post-production' && getTaskIssues(task).length > 0,
      );
    }
    return allReviewTasks;
  }, [summaryData?.data, activeFilter, tableProps.columnFilters, matchesColumnFilters]);

  // Client-paginate the filtered list
  const displayedData = useMemo(
    () => filteredAllData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filteredAllData, pageIndex, pageSize],
  );

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredAllData.length / pageSize)),
    [filteredAllData.length, pageSize],
  );

  const serializedColumnFilters = useMemo(
    () => JSON.stringify(tableProps.columnFilters),
    [tableProps.columnFilters],
  );

  // Store onPaginationChange callback in a mutable ref to decouple it from pagination state changes
  const onPaginationChangeRef = useRef(onPaginationChange);
  useEffect(() => {
    onPaginationChangeRef.current = onPaginationChange;
  }, [onPaginationChange]);

  // Reset pagination pageIndex to 0 when activeFilter or column filters change
  useEffect(() => {
    onPaginationChangeRef.current((prev) => {
      if (prev.pageIndex === 0)
        return prev;
      return {
        ...prev,
        pageIndex: 0,
      };
    });
  }, [activeFilter, serializedColumnFilters]);

  const effectivePagination = useMemo(() => ({
    pageIndex,
    pageSize,
    total: filteredAllData.length,
    pageCount,
  }), [filteredAllData.length, pageIndex, pageSize, pageCount]);

  // Once summaryData has resolved, override the URL-state page count with the
  // merged (dated + undated) page count so useTableUrlState's auto-correction
  // does not clamp pageIndex to the smaller server-only range, which would
  // make later pages of the merged queue unreachable.
  useEffect(() => {
    if (summaryData !== undefined) {
      setPageCount(pageCount);
    }
  }, [pageCount, summaryData, setPageCount]);

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
                setDate={reviewScopeProps.onDateRangeChange}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reviewScopeProps.onResetDateRange}
                >
                  Today
                </Button>
                {stats.ready > 0 && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 ml-auto sm:ml-2 shadow-sm transition-all duration-150 active:scale-95"
                    onClick={() => bulkApprove(readyTaskUids)}
                    disabled={isApproving}
                  >
                    {isApproving ? 'Approving...' : `Approve All Ready (${stats.ready})`}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Visual Dashboard cards */}
        <StudioTaskReviewSummaryPanel
          stats={stats}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />

        {/* Toggle tabs for main table filter */}
        <div className="flex border-b border-muted py-2 gap-2 overflow-x-auto scrollbar-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
          <Button
            type="button"
            variant={activeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className="text-xs font-semibold rounded-md flex-shrink-0"
          >
            All Tasks (
            {stats.total}
            )
          </Button>
          <Button
            type="button"
            variant={activeFilter === 'ready' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('ready')}
            className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Ready for Approval</span>
          </Button>
          <Button
            type="button"
            variant={
              ['attention', 'pre-prod-attention', 'on-air-attention', 'post-prod-attention'].includes(activeFilter)
                ? 'default'
                : 'ghost'
            }
            size="sm"
            onClick={() => setActiveFilter('attention')}
            className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <span>Needs Attention</span>
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          data={displayedData}
          columns={tableProps.columns}
          isLoading={tableProps.isLoading || (isSummaryFetching && !summaryData)}
          isFetching={tableProps.isFetching || isSummaryFetching}
          emptyMessage={tableProps.emptyMessage}
          manualPagination
          manualFiltering
          pageCount={pageCount}
          paginationState={{
            pageIndex: effectivePagination.pageIndex,
            pageSize: effectivePagination.pageSize,
          }}
          onPaginationChange={adaptPaginationChange(effectivePagination, tableProps.onPaginationChange)}
          columnFilters={tableProps.columnFilters}
          onColumnFiltersChange={adaptColumnFiltersChange(tableProps.columnFilters, tableProps.onColumnFiltersChange)}
          renderToolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchableColumns={taskReviewSearchableColumns}
              searchColumn={tableProps.searchColumn}
              searchPlaceholder={tableProps.searchPlaceholder}
              featuredFilterColumns={[...tableProps.featuredFilterColumns]}
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
              pagination={effectivePagination}
              onPaginationChange={tableProps.onPaginationChange}
            />
          )}
        />

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
