import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
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
import { getClients } from '@/features/clients/api/get-clients';
import { getMemberships } from '@/features/memberships/api/get-memberships';
import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';
import { BulkApproveResultsDialog } from '@/features/tasks/components/bulk-approve-results-dialog';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { StudioTaskReviewSummaryPanel, type TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { getTaskIssues, getTaskPhase, studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useBulkApproveTasks } from '@/features/tasks/hooks/use-bulk-approve-tasks';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';
import { useTaskReviewSummary } from '@/features/tasks/hooks/use-task-review-summary';

function useTaskReviewClientFilter(studioId: string, selectedClientName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['task-review-client-filter', 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      getClients(
        { name: search || undefined, limit: search ? 20 : 10 },
        studioId,
        { signal },
      ),
    enabled: Boolean(studioId),
    staleTime: 60 * 60 * 1000,
  });

  const selectedQuery = useQuery({
    queryKey: ['task-review-client-filter', 'by-name', studioId, selectedClientName],
    queryFn: ({ signal }) =>
      getClients(
        { name: selectedClientName, limit: 1 },
        studioId,
        { signal },
      ),
    enabled: Boolean(studioId && selectedClientName),
    staleTime: 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((client) => ({
      value: client.name,
      label: client.name,
    }));
    const selected = selectedQuery.data?.data?.[0];

    if (selected && !fetched.some((option) => option.value === selected.name)) {
      return [{ value: selected.name, label: selected.name }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}

function useTaskReviewUserFilter(studioId: string, selectedUserName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['task-review-user-filter', 'list', studioId, { search }],
    queryFn: () =>
      getMemberships({
        name: search || undefined,
        limit: search ? 20 : 10,
        studio_id: studioId,
      }),
    enabled: Boolean(studioId),
    staleTime: 60 * 60 * 1000,
  });

  const selectedQuery = useQuery({
    queryKey: ['task-review-user-filter', 'by-name', studioId, selectedUserName],
    queryFn: () =>
      getMemberships({
        name: selectedUserName,
        limit: 1,
        studio_id: studioId,
      }),
    enabled: Boolean(studioId && selectedUserName),
    staleTime: 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((membership) => ({
      value: membership.user.name,
      label: membership.user.name,
    }));
    const selected = selectedQuery.data?.data?.[0];

    if (selected && !fetched.some((option) => option.value === selected.user.name)) {
      return [{ value: selected.user.name, label: selected.user.name }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}

function useTaskReviewShowFilter(studioId: string, selectedShowName?: string) {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['task-review-show-filter', 'list', studioId, { search }],
    queryFn: ({ signal }) =>
      getStudioShows(
        studioId,
        { search: search || undefined, limit: search ? 20 : 10 },
        { signal },
      ),
    enabled: Boolean(studioId),
    staleTime: 60 * 60 * 1000,
  });

  const selectedQuery = useQuery({
    queryKey: ['task-review-show-filter', 'by-name', studioId, selectedShowName],
    queryFn: ({ signal }) =>
      getStudioShows(
        studioId,
        { search: selectedShowName, limit: 1 },
        { signal },
      ),
    enabled: Boolean(studioId && selectedShowName),
    staleTime: 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const fetched = (listQuery.data?.data ?? []).map((show) => ({
      value: show.name,
      label: show.name,
    }));
    const selected = selectedQuery.data?.data?.[0];

    if (selected && !fetched.some((option) => option.value === selected.name)) {
      return [{ value: selected.name, label: selected.name }, ...fetched];
    }

    return fetched;
  }, [listQuery.data, selectedQuery.data]);

  return {
    options,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    setSearch,
  };
}

export const Route = createFileRoute('/studios/$studioId/task-review/')({
  component: StudioTaskReviewPage,
});

function StudioTaskReviewPage() {
  const { studioId } = Route.useParams();
  const { tableProps, toolbarProps, reviewScopeProps, actionSheetProps, dueDateDialogProps, setPageCount } = useStudioTasksPageController({
    studioId,
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

  // Handler to clear selection when changing active filter tabs
  const handleActiveFilterChange = useCallback((filter: TaskReviewActiveFilter) => {
    setActiveFilter(filter);
    setRowSelection({});
  }, []);

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
    const allTasks = (summaryData?.data || []).filter(
      (task) => matchesColumnFilters(task, tableProps.columnFilters),
    );
    if (activeFilter === 'all') {
      return allTasks;
    }
    if (activeFilter === 'ready') {
      return allTasks.filter((task) => task.status === 'REVIEW' && getTaskIssues(task).length === 0);
    }
    if (activeFilter === 'attention') {
      return allTasks.filter((task) => getTaskIssues(task).length > 0);
    }
    if (activeFilter === 'done') {
      return allTasks.filter((task) => ['COMPLETED', 'CLOSED'].includes(task.status));
    }
    if (activeFilter === 'pre-prod-attention') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'pre-production' && getTaskIssues(task).length > 0,
      );
    }
    if (activeFilter === 'pre-prod-ready') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'pre-production' && task.status === 'REVIEW' && getTaskIssues(task).length === 0,
      );
    }
    if (activeFilter === 'pre-prod-done') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'pre-production' && ['COMPLETED', 'CLOSED'].includes(task.status),
      );
    }
    if (activeFilter === 'on-air-attention') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'on-air' && getTaskIssues(task).length > 0,
      );
    }
    if (activeFilter === 'on-air-ready') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'on-air' && task.status === 'REVIEW' && getTaskIssues(task).length === 0,
      );
    }
    if (activeFilter === 'on-air-done') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'on-air' && ['COMPLETED', 'CLOSED'].includes(task.status),
      );
    }
    if (activeFilter === 'post-prod-attention') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'post-production' && getTaskIssues(task).length > 0,
      );
    }
    if (activeFilter === 'post-prod-ready') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'post-production' && task.status === 'REVIEW' && getTaskIssues(task).length === 0,
      );
    }
    if (activeFilter === 'post-prod-done') {
      return allTasks.filter(
        (task) => getTaskPhase(task.type) === 'post-production' && ['COMPLETED', 'CLOSED'].includes(task.status),
      );
    }
    return allTasks;
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
        <div className="flex border-b border-muted py-2 gap-2 overflow-x-auto scrollbar-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
          <Button
            type="button"
            variant={activeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleActiveFilterChange('all')}
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
            onClick={() => handleActiveFilterChange('ready')}
            className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>
              Ready for Approval (
              {stats.ready}
              )
            </span>
          </Button>
          <Button
            type="button"
            variant={
              ['attention', 'pre-prod-attention', 'on-air-attention', 'post-prod-attention'].includes(activeFilter)
                ? 'default'
                : 'ghost'
            }
            size="sm"
            onClick={() => handleActiveFilterChange('attention')}
            className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <span>
              Needs Attention (
              {stats.attention}
              )
            </span>
          </Button>
          <Button
            type="button"
            variant={activeFilter === 'done' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleActiveFilterChange('done')}
            className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="h-2 w-2 rounded-full bg-slate-500 dark:bg-slate-400 flex-shrink-0" />
            <span>
              Done (
              {stats.done}
              )
            </span>
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
              pagination={effectivePagination}
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
