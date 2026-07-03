import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus, RefreshCw } from 'lucide-react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { getStudioTaskTemplateColumns, studioTaskTemplateSearchableColumns } from '@/features/task-templates/config/studio-task-template-columns';
import { useTaskTemplates } from '@/features/task-templates/hooks/use-task-templates';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/task-templates/')({
  component: TaskTemplatesPage,
});

function TaskTemplatesPage() {
  const { studioId } = Route.useParams();
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useTaskTemplates({ studioId });

  const { role } = useStudioAccess(studioId);
  const isAccountManager = role === STUDIO_ROLE.ACCOUNT_MANAGER;

  return (
    <PageLayout
      title="Task Templates"
      description="Manage studio task templates with moderation-aware filters and shared-field visibility."
    >
      <DataTable
        data={data}
        columns={getStudioTaskTemplateColumns(studioId, { isReadOnly: isAccountManager })}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No task templates found."
        manualPagination
        manualFiltering
        pageCount={pagination.pageCount}
        paginationState={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchableColumns={studioTaskTemplateSearchableColumns}
            searchColumn="name"
            searchPlaceholder="Search task templates..."
            featuredFilterColumns={['template_kind', 'task_type', 'is_active']}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isFetching}
              aria-label="Refresh templates"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {!isAccountManager && (
              <Button
                onClick={() => {
                  navigate({
                    to: '/studios/$studioId/task-templates/new',
                    params: { studioId },
                    search: { page: 1, limit: 10 },
                  });
                }}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            )}
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={pagination}
            onPaginationChange={onPaginationChange}
          />
        )}
      />
    </PageLayout>
  );
}
