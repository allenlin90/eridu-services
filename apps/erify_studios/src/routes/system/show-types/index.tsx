import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type {
  CreateShowTypeInput,
  ShowTypeApiResponse,
  UpdateShowTypeInput,
} from '@eridu/api-types/show-types';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  ShowTypeCreateDialog,
  ShowTypeDeleteDialog,
  ShowTypeUpdateDialog,
} from '@/features/show-types/components/show-type-dialogs';
import {
  showTypeColumns,
  showTypeSearchableColumns,
} from '@/features/show-types/config/show-type-columns';
import { showTypesSearchSchema } from '@/features/show-types/config/show-type-search-schema';
import { useShowTypes } from '@/features/show-types/hooks/use-show-types';
import { queryKeys } from '@/lib/api/query-keys';

export const Route = createFileRoute('/system/show-types/')({
  component: ShowTypesList,
  validateSearch: (search) => showTypesSearchSchema.parse(search),
});

type ShowType = ShowTypeApiResponse;

function ShowTypesList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShowType, setEditingShowType] = useState<ShowType | null>(null);

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
  } = useShowTypes();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete show type:', error);
    }
  };

  const handleCreate = async (data: CreateShowTypeInput) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateShowTypeInput) => {
    if (!editingShowType)
      return;
    await updateMutation.mutateAsync({ id: editingShowType.id, data });
    setEditingShowType(null);
  };

  return (
    <AdminLayout
      title="Show Types"
      description="Manage different types of shows"
      action={{
        label: 'Create Show Type',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('show-types')}
    >
      <AdminTable
        data={data?.data || []}
        columns={showTypeColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(type) => setEditingShowType(type)}
        onDelete={(type) => setDeleteId(type.id)}
        emptyMessage="No show types found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={showTypeSearchableColumns}
        searchPlaceholder="Search show types..."
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

      <ShowTypeCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <ShowTypeUpdateDialog
        showType={editingShowType}
        onOpenChange={(open) => !open && setEditingShowType(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ShowTypeDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
