import type { z } from 'zod';

import type { StudioRoomApiResponse } from '@eridu/api-types/studio-rooms';
import {
  createStudioRoomInputSchema,
  updateStudioRoomInputSchema,
} from '@eridu/api-types/studio-rooms';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type StudioRoom = StudioRoomApiResponse;
type StudioRoomFormData = z.infer<typeof createStudioRoomInputSchema>;
type UpdateStudioRoomFormData = z.infer<typeof updateStudioRoomInputSchema>;

type StudioRoomCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StudioRoomFormData) => Promise<void>;
  isLoading: boolean;
};

export function StudioRoomCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: StudioRoomCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Room"
      description="Add a new room to this studio"
      schema={createStudioRoomInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
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
  );
}

type StudioRoomUpdateDialogProps = {
  room: StudioRoom | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateStudioRoomFormData) => Promise<void>;
  isLoading: boolean;
};

export function StudioRoomUpdateDialog({
  room,
  onOpenChange,
  onSubmit,
  isLoading,
}: StudioRoomUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!room}
      onOpenChange={onOpenChange}
      title="Edit Room"
      description="Update room information"
      schema={updateStudioRoomInputSchema}
      defaultValues={
        room
          ? {
              name: room.name,
              capacity: room.capacity,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
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
  );
}

type StudioRoomDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function StudioRoomDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: StudioRoomDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Room"
      description="Are you sure you want to delete this room? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
