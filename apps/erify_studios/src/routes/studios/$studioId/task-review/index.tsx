import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { StudioTaskReviewFilterTabs } from '@/features/tasks/components/studio-task-review-filter-tabs';
import { StudioTaskReviewSummaryPanel } from '@/features/tasks/components/studio-task-review-summary-panel';
import { TaskQcReviewSheet } from '@/features/tasks/components/task-qc-review-sheet';
import { TaskReviewDialogs } from '@/features/tasks/components/task-review-dialogs';
import { TaskReviewScopeCard } from '@/features/tasks/components/task-review-scope-card';
import { TaskReviewSelectionBar } from '@/features/tasks/components/task-review-selection-bar';
import { getBulkApprovalBlockers } from '@/features/tasks/config/studio-task-columns';
import { useTaskReviewPage } from '@/features/tasks/hooks/use-task-review-page';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import * as m from '@/paraglide/messages';

export const Route = createFileRoute('/studios/$studioId/task-review/')({
  component: StudioTaskReviewPage,
});

function StudioTaskReviewPage() {
  const { studioId } = Route.useParams();
  const { role } = useStudioAccess(studioId);
  const canManage = role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER;
  const {
    tableProps,
    toolbarProps,
    reviewScopeProps,
    actionSheetProps,
    dueDateDialogProps,
    activeFilter,
    qcReviewTask,
    setQcReviewTask,
    resultsData,
    isResultsDialogOpen,
    setIsResultsDialogOpen,
    rowSelection,
    setRowSelection,
    searchableColumns,
    stats,
    isSummaryFetching,
    bulkApprove,
    isApproving,
    selectedTaskUids,
    handleActiveFilterChange,
    handleDateRangeChange,
    handleResetDateRange,
    handleColumnFiltersChange,
  } = useTaskReviewPage(studioId, canManage);
  const { key: actionSheetKey, ...actionSheetRestProps } = actionSheetProps;
  const { key: dueDateDialogKey, ...dueDateDialogRestProps } = dueDateDialogProps;

  return (
    <PageLayout
      title={m.task_review_qc_page_title()}
      description={m.task_review_qc_page_description()}
    >
      <div className="space-y-6">
        <TaskReviewScopeCard
          dateRange={reviewScopeProps.dateRange}
          onDateRangeChange={handleDateRangeChange}
          onResetDateRange={handleResetDateRange}
        />

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
          enableRowSelection={canManage ? (row) => getBulkApprovalBlockers(row.original).length === 0 : false}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(task) => task.id}
          renderToolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchableColumns={searchableColumns}
              searchColumn={tableProps.searchColumn}
              searchPlaceholder={tableProps.searchPlaceholder}
              featuredFilterColumns={['client_id', 'platform_id', 'assignee_name', 'show_name', 'status', 'task_type']}
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
        {canManage && selectedTaskUids.length > 0
          ? (
              <TaskReviewSelectionBar
                selectedTaskUids={selectedTaskUids}
                isApproving={isApproving}
                onApprove={bulkApprove}
                onCancel={() => setRowSelection({})}
              />
            )
          : null}

        {canManage
          ? (
              <TaskReviewDialogs
                results={resultsData}
                resultsOpen={isResultsDialogOpen}
                onResultsOpenChange={setIsResultsDialogOpen}
                actionSheetKey={actionSheetKey}
                actionSheetProps={actionSheetRestProps}
                dueDateDialogKey={dueDateDialogKey}
                dueDateDialogProps={dueDateDialogRestProps}
              />
            )
          : null}

        <TaskQcReviewSheet
          studioId={studioId}
          task={qcReviewTask}
          open={Boolean(qcReviewTask)}
          onOpenChange={(open) => {
            if (!open) {
              setQcReviewTask(null);
            }
          }}
        />
      </div>
    </PageLayout>
  );
}
