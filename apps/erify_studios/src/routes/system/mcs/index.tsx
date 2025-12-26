import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { McApiResponse } from '@eridu/api-types/mcs';
import {
  createMcInputSchema,
  updateMcInputSchema,
} from '@eridu/api-types/mcs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useTableUrlState } from '@eridu/ui';

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

const mcsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/mcs/')({
  component: McsList,
  validateSearch: (search) => mcsSearchSchema.parse(search),
});

// MC type from shared schema
type Mc = McApiResponse;

type McFormData = z.infer<typeof createMcInputSchema>;
type UpdateMcFormData = z.infer<typeof updateMcInputSchema>;

function McsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMc, setEditingMc] = useState<Mc | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const { pagination, onPaginationChange, setPageCount } = useTableUrlState({
    from: '/system/mcs/',
  });

  // Fetch MCs list
  const { data, isLoading } = useAdminList<Mc>('mcs', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const createMutation = useAdminCreate<Mc, McFormData>('mcs');
  const updateMutation = useAdminUpdate<Mc, UpdateMcFormData>('mcs');
  const deleteMutation = useAdminDelete('mcs');

  // Table columns
  const columns: ColumnDef<Mc>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'alias_name',
      header: 'Alias Name',
    },
    {
      accessorKey: 'is_banned',
      header: 'Status',
      cell: ({ row }) => (row.original.is_banned ? 'Banned' : 'Active'),
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
      console.error('Failed to delete MC:', error);
    }
  };

  const handleCreate = async (data: McFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: UpdateMcFormData) => {
    if (!editingMc)
      return;
    await updateMutation.mutateAsync({ id: editingMc.id, data });
    setEditingMc(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('mcs'),
    });
  };

  return (
    <AdminLayout
      title="MCs"
      description="Manage Masters of Ceremonies"
      action={{
        label: 'Create MC',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('mcs')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(mc) => setEditingMc(mc)}
        onDelete={(mc) => setDeleteId(mc.id)}
        emptyMessage="No MCs found. Create one to get started."
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
        title="Create MC"
        description="Add a new Master of Ceremonies to the system"
        schema={createMcInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter MC name',
          },
          {
            name: 'alias_name',
            label: 'Alias Name',
            placeholder: 'Enter alias name',
          },
          {
            name: 'user_id',
            label: 'User ID',
            placeholder: 'Enter User ID (optional)',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingMc}
        onOpenChange={(open) => !open && setEditingMc(null)}
        title="Edit MC"
        description="Update MC information"
        schema={updateMcInputSchema}
        defaultValues={
          editingMc
            ? {
                name: editingMc.name,
                alias_name: editingMc.alias_name,
                user_id: editingMc.user_id || undefined,
                is_banned: editingMc.is_banned,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter MC name',
          },
          {
            name: 'id' as any, // Virtual field for display
            label: 'ID',
            render: () => (
              <div className="flex flex-col gap-2">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingMc?.id || ''}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(editingMc?.id || '');
                  }}
                  title="Click to copy ID"
                />
              </div>
            ),
          },
          {
            name: 'alias_name',
            label: 'Alias Name',
            placeholder: 'Enter alias name',
          },
          {
            name: 'user_id',
            label: 'User ID',
            placeholder: 'Enter User ID (optional)',
          },
          {
            name: 'is_banned',
            label: 'Status',
            render: (field) => (
              <Select
                value={field.value ? 'banned' : 'active'}
                onValueChange={(value) => field.onChange(value === 'banned')}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            ),
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete MC"
        description="Are you sure you want to delete this MC? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
