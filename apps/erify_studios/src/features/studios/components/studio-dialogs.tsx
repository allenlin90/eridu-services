import type { z } from 'zod';

import type { StudioApiResponse } from '@eridu/api-types/studios';
import {
  createStudioInputSchema,
  updateStudioInputSchema,
} from '@eridu/api-types/studios';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type Studio = StudioApiResponse;
type StudioFormData = z.infer<typeof createStudioInputSchema>;
type UpdateStudioFormData = z.infer<typeof updateStudioInputSchema>;

type StudioCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StudioFormData) => Promise<void>;
  isLoading: boolean;
};

export function StudioCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: StudioCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Studio"
      description="Add a new studio to the system"
      schema={createStudioInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
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
  );
}

type StudioUpdateDialogProps = {
  studio: Studio | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateStudioFormData) => Promise<void>;
  isLoading: boolean;
};

export function StudioUpdateDialog({
  studio,
  onOpenChange,
  onSubmit,
  isLoading,
}: StudioUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!studio}
      onOpenChange={onOpenChange}
      title="Edit Studio"
      description="Update studio information"
      schema={updateStudioInputSchema}
      defaultValues={
        studio
          ? {
              name: studio.name,
              address: studio.address,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter studio name',
        },
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={studio?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(studio?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
        {
          name: 'address',
          label: 'Address',
          placeholder: 'Enter studio address',
        },
      ]}
    />
  );
}

type StudioDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function StudioDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: StudioDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Studio"
      description="Are you sure you want to delete this studio? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
