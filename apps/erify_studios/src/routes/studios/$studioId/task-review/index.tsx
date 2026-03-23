import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';

import { adaptColumnFiltersChange, adaptPaginationChange, Button, DataTable, DataTablePagination, DataTableToolbar } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';

export const Route = createFileRoute('/studios/$studioId/task-review/')({
  component: StudioTaskReviewPage,
});

function StudioTaskReviewPage() {
  const { studioId } = Route.useParams();
  const { tableProps, toolbarProps, actionSheetProps, dueDateDialogProps } = useStudioTasksPageController({
    studioId,
  });
  const pagination = tableProps.pagination;
  const { key: actionSheetKey, ...actionSheetRestProps } = actionSheetProps;
  const { key: dueDateDialogKey, ...dueDateDialogRestProps } = dueDateDialogProps;

  return (
    <PageLayout
      title="Task Review"
      description="Review submitted tasks and manage studio task actions."
    >
      <div className="space-y-4">
        <DataTable
          data={tableProps.data}
          columns={tableProps.columns}
          isLoading={tableProps.isLoading}
          isFetching={tableProps.isFetching}
          emptyMessage={tableProps.emptyMessage}
          manualPagination
          manualFiltering
          pageCount={pagination.pageCount}
          paginationState={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }}
          onPaginationChange={adaptPaginationChange(pagination, tableProps.onPaginationChange)}
          columnFilters={tableProps.columnFilters}
          onColumnFiltersChange={adaptColumnFiltersChange(tableProps.columnFilters, tableProps.onColumnFiltersChange)}
          renderToolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchableColumns={studioTaskSearchableColumns}
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
              pagination={pagination}
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
