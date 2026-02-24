import { createFileRoute } from '@tanstack/react-router';
import { ListTree } from 'lucide-react';
import { useState } from 'react';

import type { AdminTaskTemplateDto } from '@eridu/api-types/task-management';
import { DropdownMenuItem } from '@eridu/ui';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import { DeleteConfirmDialog } from '@/features/admin/components/delete-confirm-dialog';
import { useDeleteAdminTaskTemplate } from '@/features/task-templates/api/delete-admin-task-template';
import { SystemTaskTemplateBindingsDialog } from '@/features/task-templates/components/system-task-template-bindings-dialog';
import {
  systemTaskTemplateColumns,
  systemTaskTemplateSearchableColumns,
} from '@/features/task-templates/config/system-task-template-columns';
import { systemTaskTemplateSearchSchema } from '@/features/task-templates/config/system-task-template-search-schema';
import { useAdminTaskTemplates } from '@/features/task-templates/hooks/use-admin-task-templates';

export const Route = createFileRoute('/system/task-templates/')({
  component: SystemTaskTemplatesList,
  validateSearch: (search) => systemTaskTemplateSearchSchema.parse(search),
});

function SystemTaskTemplatesList() {
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTaskTemplateDto | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<AdminTaskTemplateDto | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useAdminTaskTemplates();
  const deleteMutation = useDeleteAdminTaskTemplate();

  const handleDelete = async () => {
    if (!deleteTemplate)
      return;
    await deleteMutation.mutateAsync(deleteTemplate.id);
    setDeleteTemplate(null);
  };

  return (
    <AdminLayout
      title="Task Templates"
      description="Manage task templates across studios with usage visibility"
      onRefresh={handleRefresh}
      refreshQueryKey={['admin-task-templates']}
    >
      <AdminTable
        data={data?.data || []}
        columns={systemTaskTemplateColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No task templates found."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={systemTaskTemplateSearchableColumns}
        searchColumn="name"
        searchPlaceholder="Search task templates..."
        featuredFilterColumns={['studio_name', 'task_type', 'is_active']}
        onDelete={(template) => setDeleteTemplate(template)}
        renderExtraActions={(template) => (
          <>
            <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
              <ListTree className="mr-2 h-4 w-4" />
              View bindings
            </DropdownMenuItem>
          </>
        )}
        pagination={
          data?.meta
            ? {
                pageIndex: data.meta.page - 1,
                pageSize: data.meta.limit,
                total: data.meta.total,
                pageCount: data.meta.totalPages,
              }
            : {
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                total: 0,
                pageCount: 0,
              }
        }
        onPaginationChange={onPaginationChange}
      />

      <SystemTaskTemplateBindingsDialog
        template={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      />

      <DeleteConfirmDialog
        open={!!deleteTemplate}
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
        onConfirm={handleDelete}
        title="Delete Task Template"
        description={`This will delete task template "${deleteTemplate?.name ?? ''}". This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
