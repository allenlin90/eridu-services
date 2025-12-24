import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { ShowStandardApiResponse } from '@eridu/api-types/show-standards';
import {
  createShowStandardInputSchema,
  updateShowStandardInputSchema,
} from '@eridu/api-types/show-standards';
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

const showStandardsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/show-standards/')({
  component: ShowStandardsList,
  validateSearch: (search) => showStandardsSearchSchema.parse(search),
});

// ShowStandard type from shared schema
type ShowStandard = ShowStandardApiResponse;

type ShowStandardFormData = z.infer<typeof createShowStandardInputSchema>;
type UpdateShowStandardFormData = z.infer<typeof updateShowStandardInputSchema>;

function ShowStandardsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShowStandard, setEditingShowStandard] = useState<ShowStandard | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const { pagination, onPaginationChange, setPageCount } = useTableUrlState({
    from: '/system/show-standards/',
  });

  // Fetch show standards list
  const { data, isLoading } = useAdminList<ShowStandard>('show-standards', {
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
  const createMutation = useAdminCreate<ShowStandard, ShowStandardFormData>('show-standards');
  const updateMutation = useAdminUpdate<ShowStandard, UpdateShowStandardFormData>('show-standards');
  const deleteMutation = useAdminDelete('show-standards');

  // Table columns
  const columns: ColumnDef<ShowStandard>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
    },
  ];

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete show standard:', error);
    }
  };

  const handleCreate = async (data: ShowStandardFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: UpdateShowStandardFormData) => {
    if (!editingShowStandard)
      return;
    await updateMutation.mutateAsync({ id: editingShowStandard.id, data });
    setEditingShowStandard(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('show-standards'),
    });
  };

  return (
    <AdminLayout
      title="Show Standards"
      description="Manage show production standards"
      action={{
        label: 'Create Show Standard',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('show-standards')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(type) => setEditingShowStandard(type)}
        onDelete={(type) => setDeleteId(type.id)}
        emptyMessage="No show standards found. Create one to get started."
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
        title="Create Show Standard"
        description="Add a new show standard to the system"
        schema={createShowStandardInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter show standard name',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingShowStandard}
        onOpenChange={(open) => !open && setEditingShowStandard(null)}
        title="Edit Show Standard"
        description="Update show standard information"
        schema={updateShowStandardInputSchema}
        defaultValues={editingShowStandard ? { name: editingShowStandard.name } : undefined}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter show standard name',
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Show Standard"
        description="Are you sure you want to delete this show standard? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
