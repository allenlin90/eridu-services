import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { StudioApiResponse } from '@eridu/api-types/studios';
import {
  createStudioInputSchema,
  updateStudioInputSchema,
} from '@eridu/api-types/studios';
import { Button, useTableUrlState } from '@eridu/ui';

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

const studiosSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/studios/')({
  component: StudiosList,
  validateSearch: (search) => studiosSearchSchema.parse(search),
});

// Studio type from shared schema
type Studio = StudioApiResponse;

type StudioFormData = z.infer<typeof createStudioInputSchema>;
type UpdateStudioFormData = z.infer<typeof updateStudioInputSchema>;

function StudiosList() {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const { pagination, onPaginationChange, setPageCount } = useTableUrlState({
    from: '/system/studios/',
  });

  // Fetch studios list
  const { data, isLoading } = useAdminList<Studio>('studios', {
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
  const createMutation = useAdminCreate<Studio, StudioFormData>('studios');
  const updateMutation = useAdminUpdate<Studio, UpdateStudioFormData>('studios');
  const deleteMutation = useAdminDelete('studios');

  // Table columns
  const columns: ColumnDef<Studio>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'address',
      header: 'Address',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      id: 'actions-rooms',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: '/system/studios/$studioId/studio-rooms', params: { studioId: row.original.id } });
          }}
        >
          Manage Rooms
          {' '}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete studio:', error);
    }
  };

  const handleCreate = async (data: StudioFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: UpdateStudioFormData) => {
    if (!editingStudio)
      return;
    await updateMutation.mutateAsync({ id: editingStudio.id, data });
    setEditingStudio(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('studios'),
    });
  };

  return (
    <AdminLayout
      title="Studios"
      description="Manage studios"
      action={{
        label: 'Create Studio',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('studios')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(studio) => setEditingStudio(studio)}
        onDelete={(studio) => setDeleteId(studio.id)}
        emptyMessage="No studios found. Create one to get started."
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
        title="Create Studio"
        description="Add a new studio to the system"
        schema={createStudioInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter studio name',
          },
          {
            name: 'address',
            label: 'Address',
            placeholder: 'Enter studio address',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingStudio}
        onOpenChange={(open) => !open && setEditingStudio(null)}
        title="Edit Studio"
        description="Update studio information"
        schema={updateStudioInputSchema}
        defaultValues={
          editingStudio
            ? {
                name: editingStudio.name,
                address: editingStudio.address,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter studio name',
          },
          {
            name: 'address',
            label: 'Address',
            placeholder: 'Enter studio address',
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Studio"
        description="Are you sure you want to delete this studio? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
