import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import type { CompensationLineItemApiResponse } from '@eridu/api-types/compensation-line-items';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  DataTable,
  DataTableActions,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
import { DeleteConfirmDialog } from '@/features/admin/components/delete-confirm-dialog';
import {
  CompensationLineItemCreateDialog,
  CompensationLineItemUpdateDialog,
  type CreateCompensationLineItemFormData,
  type UpdateCompensationLineItemFormData,
} from '@/features/compensation-line-items/components/compensation-line-item-form-dialog';
import {
  systemCompensationLineItemColumns,
  systemCompensationLineItemSearchableColumns,
} from '@/features/compensation-line-items/config/system-compensation-line-item-columns';
import { systemCompensationLineItemSearchSchema } from '@/features/compensation-line-items/config/system-compensation-line-item-search-schema';
import { useAdminCompensationLineItems } from '@/features/compensation-line-items/hooks/use-admin-compensation-line-items';
import {
  useCreateAdminCompensationLineItem,
  useDeleteAdminCompensationLineItem,
  useUpdateAdminCompensationLineItem,
} from '@/features/compensation-line-items/hooks/use-compensation-line-item-mutations';

export const Route = createFileRoute('/system/compensation-line-items/')({
  component: SystemCompensationLineItemsList,
  validateSearch: (search) => systemCompensationLineItemSearchSchema.parse(search),
});

function SystemCompensationLineItemsList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompensationLineItemApiResponse | null>(null);
  const [deleteItem, setDeleteItem] = useState<CompensationLineItemApiResponse | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useAdminCompensationLineItems({ from: '/system/compensation-line-items/' });

  const createMutation = useCreateAdminCompensationLineItem();
  const updateMutation = useUpdateAdminCompensationLineItem();
  const deleteMutation = useDeleteAdminCompensationLineItem();

  const handleCreate = async (formData: CreateCompensationLineItemFormData) => {
    await createMutation.mutateAsync(formData);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (formData: UpdateCompensationLineItemFormData) => {
    if (!editingItem)
      return;
    await updateMutation.mutateAsync({ id: editingItem.id, data: formData });
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem)
      return;
    await deleteMutation.mutateAsync(deleteItem.id);
    setDeleteItem(null);
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

  const columnsWithActions = useMemo<ColumnDef<CompensationLineItemApiResponse>[]>(() => [
    ...systemCompensationLineItemColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(item) => setEditingItem(item)}
          onDelete={(item) => setDeleteItem(item)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<CompensationLineItemApiResponse>,
  ], []);

  return (
    <AdminLayout
      title="Compensation Line Items"
      description="Manage and inspect compensation line items across all studios"
      onRefresh={handleRefresh}
      refreshQueryKey={['admin-compensation-line-items']}
      action={{
        label: 'Create Line Item',
        onClick: () => setIsCreateOpen(true),
      }}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No compensation line items found."
        manualPagination
        manualFiltering
        pageCount={tablePagination.pageCount}
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
            searchableColumns={systemCompensationLineItemSearchableColumns}
            searchColumn="target_uid"
            searchPlaceholder="Search by target ID..."
            featuredFilterColumns={['studio_id', 'target_type', 'item_type']}
          />
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={tablePagination}
            onPaginationChange={onPaginationChange}
          />
        )}
      />

      <CompensationLineItemCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <CompensationLineItemUpdateDialog
        key={editingItem?.id ?? 'empty'}
        lineItem={editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Compensation Line Item"
        description={`This will delete the compensation line item for target ${deleteItem?.target_id}. This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
