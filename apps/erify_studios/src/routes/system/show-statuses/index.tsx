import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import type {
  CreateShowStatusInput,
  ShowStatusApiResponse,
  UpdateShowStatusInput,
} from '@eridu/api-types/show-statuses';
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
    pagination,
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
    } catch {
      // Global mutation error handler already shows user-facing feedback.
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

  const tablePagination = data?.meta
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
      };

  const columnsWithActions = useMemo<ColumnDef<ShowStatus>[]>(() => [
    ...showStatusColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(status) => setEditingShowStatus(status)}
          onDelete={(status) => setDeleteId(status.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<ShowStatus>,
  ], []);

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
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No show statuses found. Create one to get started."
        manualPagination
        manualFiltering
        pageCount={data?.meta?.totalPages}
        paginationState={{
          pageIndex: tablePagination.pageIndex,
          pageSize: tablePagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(tablePagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchableColumns={showStatusSearchableColumns}
            searchPlaceholder="Search show statuses..."
          />
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={tablePagination}
            onPaginationChange={onPaginationChange}
          />
        )}
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
