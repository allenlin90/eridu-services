import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
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
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { StudioTaskReviewSummaryPanel, type TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { getTaskIssues, getTaskPhase, studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';
import { useTaskReviewSummary } from '@/features/tasks/hooks/use-task-review-summary';

export const Route = createFileRoute('/studios/$studioId/task-review/')({
  component: StudioTaskReviewPage,
});

const taskReviewSearchableColumns = studioTaskSearchableColumns.filter((column) => column.id !== 'due_date');

function StudioTaskReviewPage() {
  const { studioId } = Route.useParams();
  const { tableProps, toolbarProps, reviewScopeProps, actionSheetProps, dueDateDialogProps } = useStudioTasksPageController({
    studioId,
  });
  const { onPaginationChange } = tableProps;
  const { key: actionSheetKey, ...actionSheetRestProps } = actionSheetProps;
  const { key: dueDateDialogKey, ...dueDateDialogRestProps } = dueDateDialogProps;

  // State for client-side filter
  const [activeFilter, setActiveFilter] = useState<TaskReviewActiveFilter>('all');

  // Load summary and statistics using extracted hook
  const { summaryData, stats } = useTaskReviewSummary({
    studioId,
    dateRange: reviewScopeProps.dateRange,
  });

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

  // Client-side table data filtering on the fully fetched summaryData dataset
  const filteredAllData = useMemo(() => {
    const allReviewTasks = summaryData?.data || [];
    if (activeFilter === 'ready') {
      return allReviewTasks.filter(
        (task) =>
          task.status === 'REVIEW'
          && getTaskIssues(task).length === 0
          && matchesColumnFilters(task, tableProps.columnFilters),
      );
    }
    if (activeFilter === 'attention') {
      return allReviewTasks.filter(
        (task) =>
          task.status === 'REVIEW'
          && getTaskIssues(task).length > 0
          && matchesColumnFilters(task, tableProps.columnFilters),
      );
    }
    if (activeFilter === 'pre-prod-attention') {
      return allReviewTasks.filter(
        (task) =>
          task.status === 'REVIEW'
          && getTaskPhase(task.type) === 'pre-production'
          && getTaskIssues(task).length > 0
          && matchesColumnFilters(task, tableProps.columnFilters),
      );
    }
    if (activeFilter === 'on-air-attention') {
      return allReviewTasks.filter(
        (task) =>
          task.status === 'REVIEW'
          && getTaskPhase(task.type) === 'on-air'
          && getTaskIssues(task).length > 0
          && matchesColumnFilters(task, tableProps.columnFilters),
      );
    }
    if (activeFilter === 'post-prod-attention') {
      return allReviewTasks.filter(
        (task) =>
          task.status === 'REVIEW'
          && getTaskPhase(task.type) === 'post-production'
          && getTaskIssues(task).length > 0
          && matchesColumnFilters(task, tableProps.columnFilters),
      );
    }
    return null; // For 'all' filter, we use the server-paginated data
  }, [summaryData?.data, activeFilter, tableProps.columnFilters, matchesColumnFilters]);

  // Determine displayed data and pageCount
  const displayedData = useMemo(() => {
    if (filteredAllData === null) {
      return tableProps.data; // Server-paginated current page
    }
    // Client-paginate the filtered list
    return filteredAllData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [filteredAllData, tableProps.data, pageIndex, pageSize]);

  const pageCount = useMemo(() => {
    if (filteredAllData === null) {
      return tableProps.pagination.pageCount; // Server total page count
    }
    return Math.ceil(filteredAllData.length / pageSize); // Client total page count
  }, [filteredAllData, tableProps.pagination.pageCount, pageSize]);

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

  const effectivePagination = useMemo(() => {
    if (filteredAllData === null) {
      return tableProps.pagination;
    }
    return {
      pageIndex,
      pageSize,
      total: filteredAllData.length,
      pageCount: Math.ceil(filteredAllData.length / pageSize),
    };
  }, [filteredAllData, tableProps.pagination, pageIndex, pageSize]);

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DatePickerWithRange
                className="sm:w-72"
                date={reviewScopeProps.dateRange}
                setDate={reviewScopeProps.onDateRangeChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reviewScopeProps.onResetDateRange}
              >
                Today
              </Button>
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
            {tableProps.pagination.total}
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
          isLoading={tableProps.isLoading}
          isFetching={tableProps.isFetching}
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

        <StudioTaskActionSheet key={actionSheetKey} {...actionSheetRestProps} />

        <TaskDueDateDialog key={dueDateDialogKey} {...dueDateDialogRestProps} />
      </div>
    </PageLayout>
  );
}
