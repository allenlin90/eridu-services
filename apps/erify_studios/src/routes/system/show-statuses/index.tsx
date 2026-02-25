import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type {
  CreateShowStatusInput,
  ShowStatusApiResponse,
  UpdateShowStatusInput,
} from '@eridu/api-types/show-statuses';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  ShowStatusCreateDialog,
  ShowStatusDeleteDialog,
  ShowStatusUpdateDialog,
} from '@/features/show-statuses/components/show-status-dialogs';
import {
  showStatusColumns,
  showStatusSearchableColumns,
} from '@/features/show-statuses/config/show-status-columns';
import { showStatusesSearchSchema } from '@/features/show-statuses/config/show-status-search-schema';
import { useShowStatuses } from '@/features/show-statuses/hooks/use-show-statuses';

export const Route = createFileRoute('/system/show-statuses/')({
  component: ShowStatusesList,
  validateSearch: (search) => showStatusesSearchSchema.parse(search),
});

type ShowStatus = ShowStatusApiResponse;

function ShowStatusesList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShowStatus, setEditingShowStatus] = useState<ShowStatus | null>(null);

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
  } = useShowStatuses();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete show status:', error);
    }
  };

  const handleCreate = async (data: CreateShowStatusInput) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateShowStatusInput) => {
    if (!editingShowStatus)
      return;
    await updateMutation.mutateAsync({ id: editingShowStatus.id, data });
    setEditingShowStatus(null);
  };

  return (
    <AdminLayout
      title="Show Statuses"
      description="Manage show statuses"
      action={{
        label: 'Create Show Status',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['show-statuses']}
    >
      <AdminTable
        data={data?.data || []}
        columns={showStatusColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(status) => setEditingShowStatus(status)}
        onDelete={(status) => setDeleteId(status.id)}
        emptyMessage="No show statuses found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={showStatusSearchableColumns}
        searchPlaceholder="Search show statuses..."
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

      <ShowStatusCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <ShowStatusUpdateDialog
        showStatus={editingShowStatus}
        onOpenChange={(open) => !open && setEditingShowStatus(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ShowStatusDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
