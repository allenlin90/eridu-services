import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  createShowStandardInputSchema,
  ShowStandardApiResponse,
  updateShowStandardInputSchema,
} from '@eridu/api-types/show-standards';
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
    } catch {
      // Global mutation error handler already shows user-facing feedback.
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

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<ShowStandard>[]>(() => [
    ...showStandardColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(type) => setEditingShowStandard(type)}
          onDelete={(type) => setDeleteId(type.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<ShowStandard>,
  ], []);

  return (
    <AdminLayout
      title="Show Standards"
      description="Manage show production standards"
      action={{
        label: 'Create Show Standard',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['show-standards']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No show standards found. Create one to get started."
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
            searchableColumns={showStandardSearchableColumns}
            searchPlaceholder="Search show standards..."
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
