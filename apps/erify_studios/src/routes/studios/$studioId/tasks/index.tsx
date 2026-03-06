import { createFileRoute } from '@tanstack/react-router';
import { RotateCw } from 'lucide-react';

import { adaptColumnFiltersChange, adaptPaginationChange, Button, DataTable, DataTablePagination, DataTableToolbar } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import { studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useStudioTasksPageController } from '@/features/tasks/hooks/use-studio-tasks-page-controller';

export const Route = createFileRoute('/studios/$studioId/tasks/')({
  component: StudioTasksPage,
});

function StudioTasksPage() {
  const { studioId } = Route.useParams();
  const { tableProps, toolbarProps, actionSheetProps, dueDateDialogProps } = useStudioTasksPageController({
    studioId,
  });
  const pagination = tableProps.pagination;
  const { key: actionSheetKey, ...actionSheetRestProps } = actionSheetProps;
  const { key: dueDateDialogKey, ...dueDateDialogRestProps } = dueDateDialogProps;

  return (
    <PageLayout
      title="Review Queue"
      description="Review submitted tasks and manage task actions across the studio."
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
                size="sm"
                className="h-8 w-full sm:w-auto"
                onClick={toolbarProps.onRefresh}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Refresh
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
