import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  createShowStandardInputSchema,
  ShowStandardApiResponse,
  updateShowStandardInputSchema,
} from '@eridu/api-types/show-standards';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  ShowStandardCreateDialog,
  ShowStandardDeleteDialog,
  ShowStandardUpdateDialog,
} from '@/features/show-standards/components/show-standard-dialogs';
import {
  showStandardColumns,
  showStandardSearchableColumns,
} from '@/features/show-standards/config/show-standard-columns';
import { showStandardsSearchSchema } from '@/features/show-standards/config/show-standard-search-schema';
import { useShowStandards } from '@/features/show-standards/hooks/use-show-standards';
import { queryKeys } from '@/lib/api/query-keys';

export const Route = createFileRoute('/system/show-standards/')({
  component: ShowStandardsList,
  validateSearch: (search) => showStandardsSearchSchema.parse(search),
});

type ShowStandard = ShowStandardApiResponse;
type ShowStandardFormData = z.infer<typeof createShowStandardInputSchema>;
type UpdateShowStandardFormData = z.infer<typeof updateShowStandardInputSchema>;

function ShowStandardsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShowStandard, setEditingShowStandard] = useState<ShowStandard | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  } = useShowStandards();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete show standard:', error);
    }
  };

  const handleCreate = async (data: ShowStandardFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateShowStandardFormData) => {
    if (!editingShowStandard)
      return;
    await updateMutation.mutateAsync({ id: editingShowStandard.id, data });
    setEditingShowStandard(null);
  };

  return (
    <AdminLayout
      title="Show Standards"
      description="Manage show production standards"
      action={{
        label: 'Create Show Standard',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('show-standards')}
    >
      <AdminTable
        data={data?.data || []}
        columns={showStandardColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(type) => setEditingShowStandard(type)}
        onDelete={(type) => setDeleteId(type.id)}
        emptyMessage="No show standards found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={showStandardSearchableColumns}
        searchPlaceholder="Search show standards..."
        pagination={
          data?.meta
            ? {
                pageIndex: data.meta.page - 1,
                pageSize: data.meta.limit,
                total: data.meta.total,
                pageCount: data.meta.totalPages,
              }
            : undefined
        }
        onPaginationChange={onPaginationChange}
      />

      <ShowStandardCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <ShowStandardUpdateDialog
        showStandard={editingShowStandard}
        onOpenChange={(open) => !open && setEditingShowStandard(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ShowStandardDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
