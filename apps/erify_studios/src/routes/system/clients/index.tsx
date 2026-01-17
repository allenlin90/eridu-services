import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  ClientApiResponse,
  createClientInputSchema,
  updateClientInputSchema,
} from '@eridu/api-types/clients';

import { AdminLayout, AdminTable } from '@/features/admin/components';
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
import { queryKeys } from '@/lib/api/query-keys';

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

  return (
    <AdminLayout
      title="Clients"
      description="Manage clients and their information"
      action={{
        label: 'Create Client',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('clients')}
    >
      <AdminTable
        data={data?.data || []}
        columns={clientColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(client) => setEditingClient(client)}
        onDelete={(client) => setDeleteId(client.id)}
        emptyMessage="No clients found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={clientSearchableColumns}
        searchPlaceholder="Search clients..."
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
