import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  createCreatorInputSchema,
  CreatorApiResponse,
  updateCreatorInputSchema,
} from '@eridu/api-types/creators';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  DataTable,
  DataTableActions,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
import {
  CreatorCreateDialog,
  CreatorDeleteDialog,
  CreatorUpdateDialog,
} from '@/features/creators/components/creator-dialogs';
import {
  creatorColumns,
  creatorSearchableColumns,
} from '@/features/creators/config/creator-columns';
import { creatorsSearchSchema } from '@/features/creators/config/creators-search-schema';
import { useCreators } from '@/features/creators/hooks/use-creators';

export const Route = createFileRoute('/system/creators/')({
  component: CreatorsList,
  validateSearch: (search) => creatorsSearchSchema.parse(search),
});

type Creator = CreatorApiResponse;
type CreatorFormData = z.infer<typeof createCreatorInputSchema>;
type UpdateCreatorFormData = z.infer<typeof updateCreatorInputSchema>;

function CreatorsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);

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
  } = useCreators();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete creator:', error);
    }
  };

  const handleCreate = async (data: CreatorFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateCreatorFormData) => {
    if (!editingCreator)
      return;
    await updateMutation.mutateAsync({ id: editingCreator.id, data });
    setEditingCreator(null);
  };

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<Creator>[]>(() => [
    ...creatorColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(creator) => setEditingCreator(creator)}
          onDelete={(creator) => setDeleteId(creator.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Creator>,
  ], []);

  return (
    <AdminLayout
      title="Creators"
      description="Manage creators"
      action={{
        label: 'Create Creator',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['creators']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No creators found. Create one to get started."
        manualPagination={!!pagination}
        manualFiltering
        pageCount={pagination?.pageCount}
        paginationState={pagination
          ? {
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            }
          : undefined}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchableColumns={creatorSearchableColumns}
            searchPlaceholder="Search by name..."
          />
        )}
        renderFooter={() => pagination
          ? (
              <DataTablePagination
                pagination={pagination}
                onPaginationChange={onPaginationChange}
              />
            )
          : null}
      />

      <CreatorCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <CreatorUpdateDialog
        creator={editingCreator}
        onOpenChange={(open) => !open && setEditingCreator(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <CreatorDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
