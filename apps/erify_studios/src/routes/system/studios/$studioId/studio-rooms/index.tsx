import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { StudioRoomApiResponse } from '@eridu/api-types/studio-rooms';
import {
  createStudioRoomInputSchema,
  updateStudioRoomInputSchema,
} from '@eridu/api-types/studio-rooms';
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

const studioRoomsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute(
  '/system/studios/$studioId/studio-rooms/',
)({
  component: StudioRoomsList,
  validateSearch: (search) => studioRoomsSearchSchema.parse(search),
});

// StudioRoom type from shared schema
type StudioRoom = StudioRoomApiResponse;

type StudioRoomFormData = z.infer<typeof createStudioRoomInputSchema>;
type UpdateStudioRoomFormData = z.infer<typeof updateStudioRoomInputSchema>;

export function StudioRoomsList() {
  const { studioId } = Route.useParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<StudioRoom | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/studios/$studioId/studio-rooms/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;

  // Fetch studio rooms list
  const { data, isLoading } = useAdminList<StudioRoom>('studio-rooms', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    studio_id: studioId,
    name: nameFilter,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const createMutation = useAdminCreate<StudioRoom, StudioRoomFormData>('studio-rooms');
  const updateMutation = useAdminUpdate<StudioRoom, UpdateStudioRoomFormData>('studio-rooms');
  const deleteMutation = useAdminDelete('studio-rooms');

  // Table columns
  const columns: ColumnDef<StudioRoom>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
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
      console.error('Failed to delete studio room:', error);
    }
  };

  const handleCreate = async (data: StudioRoomFormData) => {
    await createMutation.mutateAsync({ ...data, studio_id: studioId });
  };

  const handleUpdate = async (data: UpdateStudioRoomFormData) => {
    if (!editingRoom)
      return;
    await updateMutation.mutateAsync({ id: editingRoom.id, data });
    setEditingRoom(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('studio-rooms'),
    });
  };

  return (
    <AdminLayout
      title="Studio Rooms"
      description="Manage rooms for this studio"
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('studio-rooms')}
      action={{
        label: 'Create Room',
        onClick: () => setIsCreateDialogOpen(true),
      }}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(room) => setEditingRoom(room)}
        onDelete={(room) => setDeleteId(room.id)}
        emptyMessage="No rooms found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={[
          { id: 'name', title: 'Name' },
        ]}
        searchPlaceholder="Search rooms..."
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
        title="Create Room"
        description="Add a new room to this studio"
        schema={createStudioRoomInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter room name',
          },
          {
            name: 'capacity',
            label: 'Capacity',
            placeholder: 'Enter room capacity',
            type: 'number',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingRoom}
        onOpenChange={(open) => !open && setEditingRoom(null)}
        title="Edit Room"
        description="Update room information"
        schema={updateStudioRoomInputSchema}
        defaultValues={
          editingRoom
            ? {
                name: editingRoom.name,
                capacity: editingRoom.capacity,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter room name',
          },
          {
            name: 'capacity',
            label: 'Capacity',
            placeholder: 'Enter room capacity',
            type: 'number',
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Room"
        description="Are you sure you want to delete this room? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
