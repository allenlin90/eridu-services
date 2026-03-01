import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  ClientApiResponse,
  createClientInputSchema,
  updateClientInputSchema,
} from '@eridu/api-types/clients';

import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  DataTable,
  DataTableActions,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table';
import { AdminLayout } from '@/features/admin/components';
import {
  ClientCreateDialog,
  ClientDeleteDialog,
  ClientUpdateDialog,
} from '@/features/clients/components/client-dialogs';
import {
  clientColumns,
  clientSearchableColumns,
} from '@/features/clients/config/client-columns';
import { clientsSearchSchema } from '@/features/clients/config/client-search-schema';
import { useClients } from '@/features/clients/hooks/use-clients';

export const Route = createFileRoute('/system/clients/')({
  component: ClientsList,
  validateSearch: (search) => clientsSearchSchema.parse(search),
});

type Client = ClientApiResponse;
type ClientFormData = z.infer<typeof createClientInputSchema>;
type UpdateClientFormData = z.infer<typeof updateClientInputSchema>;

function ClientsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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
  } = useClients();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const handleCreate = async (data: ClientFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateClientFormData) => {
    if (!editingClient)
      return;
    await updateMutation.mutateAsync({ id: editingClient.id, data });
    setEditingClient(null);
  };

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<Client>[]>(() => [
    ...clientColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(client) => setEditingClient(client)}
          onDelete={(client) => setDeleteId(client.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Client>,
  ], []);

  return (
    <AdminLayout
      title="Clients"
      description="Manage clients and their information"
      action={{
        label: 'Create Client',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['clients']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No clients found. Create one to get started."
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
            searchableColumns={clientSearchableColumns}
            searchPlaceholder="Search clients..."
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

      <ClientCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <ClientUpdateDialog
        client={editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ClientDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
