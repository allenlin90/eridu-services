import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  StudioRoomApiResponse,
  updateStudioRoomInputSchema,
} from '@eridu/api-types/studio-rooms';
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
type CreateStudioRoomFormData = z.infer<typeof updateStudioRoomInputSchema>;

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

  const onCreateSubmit = async (formData: CreateStudioRoomFormData) => {
    await handleCreate(formData);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateStudioRoomFormData) => {
    if (!editingRoom)
      return;
    await updateMutation.mutateAsync({ id: editingRoom.id, data });
    setEditingRoom(null);
  };

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<StudioRoom>[]>(() => [
    ...studioRoomColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(room) => setEditingRoom(room)}
          onDelete={(room) => setDeleteId(room.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<StudioRoom>,
  ], []);

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
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No rooms found. Create one to get started."
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
            searchableColumns={studioRoomSearchableColumns}
            searchPlaceholder="Search rooms..."
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
