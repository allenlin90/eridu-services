import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import type {
  CreateShowTypeInput,
  ShowTypeApiResponse,
  UpdateShowTypeInput,
} from '@eridu/api-types/show-types';
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

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<ShowType>[]>(() => [
    ...showTypeColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(type) => setEditingShowType(type)}
          onDelete={(type) => setDeleteId(type.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<ShowType>,
  ], []);

  return (
    <AdminLayout
      title="Show Types"
      description="Manage different types of shows"
      action={{
        label: 'Create Show Type',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['show-types']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No show types found. Create one to get started."
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
            searchableColumns={showTypeSearchableColumns}
            searchPlaceholder="Search show types..."
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
