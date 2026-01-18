import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  StudioRoomApiResponse,
  updateStudioRoomInputSchema,
} from '@eridu/api-types/studio-rooms';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  StudioRoomCreateDialog,
  StudioRoomDeleteDialog,
  StudioRoomUpdateDialog,
} from '@/features/studio-rooms/components/studio-room-dialogs';
import {
  studioRoomColumns,
  studioRoomSearchableColumns,
} from '@/features/studio-rooms/config/studio-room-columns';
import { studioRoomsSearchSchema } from '@/features/studio-rooms/config/studio-room-search-schema';
import { useStudioRooms } from '@/features/studio-rooms/hooks/use-studio-rooms';

export const Route = createFileRoute(
  '/system/studios/$studioId/studio-rooms/',
)({
  component: StudioRoomsList,
  validateSearch: (search) => studioRoomsSearchSchema.parse(search),
});

type StudioRoom = StudioRoomApiResponse;
type UpdateStudioRoomFormData = z.infer<typeof updateStudioRoomInputSchema>;

export function StudioRoomsList() {
  const { studioId } = Route.useParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<StudioRoom | null>(null);

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
    handleCreate,
  } = useStudioRooms(studioId);

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

  const onCreateSubmit = async (formData: any) => {
    await handleCreate(formData);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateStudioRoomFormData) => {
    if (!editingRoom)
      return;
    await updateMutation.mutateAsync({ id: editingRoom.id, data });
    setEditingRoom(null);
  };

  return (
    <AdminLayout
      title="Studio Rooms"
      description="Manage rooms for this studio"
      onRefresh={handleRefresh}
      refreshQueryKey={['studio-rooms']}
      action={{
        label: 'Create Room',
        onClick: () => setIsCreateDialogOpen(true),
      }}
    >
      <AdminTable
        data={data?.data || []}
        columns={studioRoomColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(room) => setEditingRoom(room)}
        onDelete={(room) => setDeleteId(room.id)}
        emptyMessage="No rooms found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={studioRoomSearchableColumns}
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

      <StudioRoomCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={onCreateSubmit}
        isLoading={createMutation.isPending}
      />

      <StudioRoomUpdateDialog
        room={editingRoom}
        onOpenChange={(open) => !open && setEditingRoom(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <StudioRoomDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
