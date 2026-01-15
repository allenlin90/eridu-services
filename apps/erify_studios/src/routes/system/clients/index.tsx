import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { ClientApiResponse } from '@eridu/api-types/clients';
import {
  createClientInputSchema,
  updateClientInputSchema,
} from '@eridu/api-types/clients';
import { useTableUrlState } from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const clientsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/clients/')({
  component: ClientsList,
  validateSearch: (search) => clientsSearchSchema.parse(search),
});

// Client type from shared schema
type Client = ClientApiResponse;

type ClientFormData = z.infer<typeof createClientInputSchema>;
type UpdateClientFormData = z.infer<typeof updateClientInputSchema>;

function ClientsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/clients/',
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;

  // Fetch clients list
  const { data, isLoading, isFetching } = useAdminList<Client>('clients', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const createMutation = useAdminCreate<Client, ClientFormData>('clients');
  const updateMutation = useAdminUpdate<Client, UpdateClientFormData>('clients');
  const deleteMutation = useAdminDelete('clients');

  // Table columns
  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'contact_person',
      header: 'Contact Person',
    },
    {
      accessorKey: 'contact_email',
      header: 'Contact Email',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
  ];

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
  };

  const handleUpdate = async (data: UpdateClientFormData) => {
    if (!editingClient)
      return;
    await updateMutation.mutateAsync({ id: editingClient.id, data });
    setEditingClient(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('clients'),
    });
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
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(client) => setEditingClient(client)}
        onDelete={(client) => setDeleteId(client.id)}
        emptyMessage="No clients found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchColumn="name"
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

      <AdminFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create Client"
        description="Add a new client to the system"
        schema={createClientInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter client name',
          },
          {
            name: 'contact_person',
            label: 'Contact Person',
            placeholder: 'Enter contact person',
          },
          {
            name: 'contact_email',
            label: 'Contact Email',
            placeholder: 'Enter contact email',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        title="Edit Client"
        description="Update client information"
        schema={updateClientInputSchema}
        defaultValues={
          editingClient
            ? {
                name: editingClient.name,
                contact_person: editingClient.contact_person,
                contact_email: editingClient.contact_email,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter client name',
          },
          {
            name: 'id' as any, // Virtual field for display
            label: 'ID',
            render: () => (
              <div className="flex flex-col gap-2">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingClient?.id || ''}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(editingClient?.id || '');
                  }}
                  title="Click to copy ID"
                />
              </div>
            ),
          },
          {
            name: 'contact_person',
            label: 'Contact Person',
            placeholder: 'Enter contact person',
          },
          {
            name: 'contact_email',
            label: 'Contact Email',
            placeholder: 'Enter contact email',
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
