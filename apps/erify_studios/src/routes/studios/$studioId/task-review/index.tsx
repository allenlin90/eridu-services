import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  Archive,
  Clock,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { cn } from '@eridu/ui/lib/utils';

import { PageLayout } from '@/components/layouts/page-layout';
import { getStudioTasks, studioTasksKeys } from '@/features/tasks/api/get-studio-tasks';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { getTaskIssues, getTaskPhase, studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';
import { isCurrentOperationalDay, OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS, operationalWindowToDayRange } from '@/lib/operational-day-range';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'attention'>('all');

  // Compute effective date range for fetching ALL Review-status tasks in parallel
  const effectiveRange = useMemo(
    () => operationalWindowToDayRange(reviewScopeProps.dateRange),
    [reviewScopeProps.dateRange],
  );

  // Parallel query parameters (fetch base params)
  const summaryParams = useMemo(() => ({
    due_date_from: effectiveRange.windowStart.toISOString(),
    due_date_to: effectiveRange.windowEnd.toISOString(),
    status: 'REVIEW' as const,
    limit: 100,
  }), [effectiveRange]);

  const isViewingCurrentOperationalDay = useMemo(
    () => isCurrentOperationalDay(effectiveRange),
    [effectiveRange],
  );

  const { data: summaryData } = useQuery({
    queryKey: studioTasksKeys.list(studioId, summaryParams),
    queryFn: async ({ signal }) => {
      // 1. Fetch the first page to get metadata and first batch
      const firstPage = await getStudioTasks(studioId, { ...summaryParams, page: 1 }, { signal });
      const totalPages = firstPage.meta?.totalPages || 1;

      if (totalPages <= 1) {
        return firstPage;
      }

      // 2. Fetch all remaining pages concurrently
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(
          getStudioTasks(studioId, { ...summaryParams, page: p }, { signal }),
        );
      }

      const otherPages = await Promise.all(pagePromises);

      // 3. Merge all data
      const allData = [
        ...firstPage.data,
        ...otherPages.flatMap((page) => page.data),
      ];

      return {
        data: allData,
        meta: {
          ...firstPage.meta,
          limit: allData.length,
          totalPages: 1,
        },
      };
    },
    enabled: !!studioId,
    refetchInterval: isViewingCurrentOperationalDay
      ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: false,
  });

  // Group and compute statistics dynamically
  const stats = useMemo(() => {
    const allReviewTasks = summaryData?.data || [];
    let ready = 0;
    let attention = 0;
    const preProdAttention: string[] = [];
    const preProdReady: string[] = [];
    const onAirAttention: string[] = [];
    const onAirReady: string[] = [];
    const postProdAttention: string[] = [];
    const postProdReady: string[] = [];

    allReviewTasks.forEach((task) => {
      const issues = getTaskIssues(task);
      const hasIssues = issues.length > 0;
      const phase = getTaskPhase(task.type);

      if (hasIssues) {
        attention++;
        if (phase === 'pre-production')
          preProdAttention.push(task.id);
        else if (phase === 'post-production')
          postProdAttention.push(task.id);
        else onAirAttention.push(task.id);
      } else {
        ready++;
        if (phase === 'pre-production')
          preProdReady.push(task.id);
        else if (phase === 'post-production')
          postProdReady.push(task.id);
        else onAirReady.push(task.id);
      }
    });

    return {
      total: allReviewTasks.length,
      ready,
      attention,
      preProdAttentionCount: preProdAttention.length,
      preProdReadyCount: preProdReady.length,
      onAirAttentionCount: onAirAttention.length,
      onAirReadyCount: onAirReady.length,
      postProdAttentionCount: postProdAttention.length,
      postProdReadyCount: postProdReady.length,
    };
  }, [summaryData]);

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
        const client = (task.show?.client?.name || '').toLowerCase();
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

  // Reset pagination pageIndex to 0 when activeFilter changes
  useEffect(() => {
    onPaginationChange((prev) => {
      if (prev.pageIndex === 0)
        return prev;
      return {
        ...prev,
        pageIndex: 0,
      };
    });
  }, [activeFilter, onPaginationChange]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Review Overview */}
          <div
            onClick={() => setActiveFilter('all')}
            className={cn(
              'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-indigo-500/5 to-purple-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
              activeFilter === 'all' ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/20' : 'border-muted/60 dark:border-muted/30',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Review Overview</span>
              <Inbox className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{stats.total}</span>
              <span className="text-xs text-muted-foreground">Tasks in Review</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter('ready');
                }}
                className={cn(
                  'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
                  activeFilter === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500',
                )}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" style={{ animationDuration: '3s' }} />
                <span>
                  {stats.ready}
                  {' '}
                  Ready
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter('attention');
                }}
                className={cn(
                  'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
                  activeFilter === 'attention' ? 'text-rose-600 dark:text-rose-400' : 'text-rose-500',
                )}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" style={{ animationDuration: '2s' }} />
                <span>
                  {stats.attention}
                  {' '}
                  Attention
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Pre-Production Exceptions */}
          <div
            onClick={() => setActiveFilter('attention')}
            className={cn(
              'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-blue-500/5 to-cyan-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
              activeFilter === 'attention' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/10 dark:bg-blue-950/20' : 'border-muted/60 dark:border-muted/30',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Pre-Production (SETUP)</span>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold tracking-tight transition-all duration-200', stats.preProdAttentionCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : '')}>
                {stats.preProdAttentionCount}
              </span>
              <span className="text-xs text-muted-foreground">Needs Attention</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>
                {stats.preProdReadyCount}
                {' '}
                Ready for Approval
              </span>
            </div>
          </div>

          {/* Card 3: On-Air Exceptions */}
          <div
            onClick={() => setActiveFilter('attention')}
            className={cn(
              'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-amber-500/5 to-orange-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
              activeFilter === 'attention' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/10 dark:bg-amber-950/20' : 'border-muted/60 dark:border-muted/30',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">On-Air (ACTIVE/ROUTINE)</span>
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold tracking-tight transition-all duration-200', stats.onAirAttentionCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : '')}>
                {stats.onAirAttentionCount}
              </span>
              <span className="text-xs text-muted-foreground">Needs Attention</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>
                {stats.onAirReadyCount}
                {' '}
                Ready for Approval
              </span>
            </div>
          </div>

          {/* Card 4: Post-Production Exceptions */}
          <div
            onClick={() => setActiveFilter('attention')}
            className={cn(
              'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-rose-500/5 to-pink-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
              activeFilter === 'attention' ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-500/10 dark:bg-rose-950/20' : 'border-muted/60 dark:border-muted/30',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Post-Production (CLOSURE)</span>
              <Archive className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold tracking-tight transition-all duration-200', stats.postProdAttentionCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : '')}>
                {stats.postProdAttentionCount}
              </span>
              <span className="text-xs text-muted-foreground">Needs Attention</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>
                {stats.postProdReadyCount}
                {' '}
                Ready for Approval
              </span>
            </div>
          </div>
        </div>

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
            {tableProps.data.length}
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
            variant={activeFilter === 'attention' ? 'default' : 'ghost'}
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
