import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  createMcInputSchema,
  McApiResponse,
  updateMcInputSchema,
} from '@eridu/api-types/mcs';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  McCreateDialog,
  McDeleteDialog,
  McUpdateDialog,
} from '@/features/mcs/components/mc-dialogs';
import {
  mcColumns,
  mcSearchableColumns,
} from '@/features/mcs/config/mc-columns';
import { mcsSearchSchema } from '@/features/mcs/config/mc-search-schema';
import { useMcs } from '@/features/mcs/hooks/use-mcs';

export const Route = createFileRoute('/system/mcs/')({
  component: McsList,
  validateSearch: (search) => mcsSearchSchema.parse(search),
});

type Mc = McApiResponse;
type McFormData = z.infer<typeof createMcInputSchema>;
type UpdateMcFormData = z.infer<typeof updateMcInputSchema>;

function McsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMc, setEditingMc] = useState<Mc | null>(null);

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
  } = useMcs();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete MC:', error);
    }
  };

  const handleCreate = async (data: McFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateMcFormData) => {
    if (!editingMc)
      return;
    await updateMutation.mutateAsync({ id: editingMc.id, data });
    setEditingMc(null);
  };

  return (
    <AdminLayout
      title="MCs"
      description="Manage Masters of Ceremonies"
      action={{
        label: 'Create MC',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['mcs']}
    >
      <AdminTable
        data={data?.data || []}
        columns={mcColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(mc) => setEditingMc(mc)}
        onDelete={(mc) => setDeleteId(mc.id)}
        emptyMessage="No MCs found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={mcSearchableColumns}
        searchPlaceholder="Search by name..."
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

      <McCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <McUpdateDialog
        mc={editingMc}
        onOpenChange={(open) => !open && setEditingMc(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <McDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
