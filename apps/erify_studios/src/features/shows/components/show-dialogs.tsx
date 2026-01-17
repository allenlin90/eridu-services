import type { z } from 'zod';

import { updateShowInputSchema } from '@eridu/api-types/shows';
import { Input } from '@eridu/ui';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import type { Show } from '@/features/shows/api/get-shows';

type UpdateShowFormData = z.infer<typeof updateShowInputSchema>;

type ShowUpdateDialogProps = {
  show: Show | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateShowFormData) => Promise<void>;
  isLoading: boolean;
};

export function ShowUpdateDialog({
  show,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!show}
      onOpenChange={onOpenChange}
      title="Edit Show"
      description="Update show details"
      schema={updateShowInputSchema}
      defaultValues={
        show
          ? {
              name: show.name,
              start_time: show.start_time,
              end_time: show.end_time,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={show?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(show?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Show name',
        },
        {
          name: 'start_time',
          label: 'Start Time',
          render: (field) => (
            <Input
              type="datetime-local"
              {...field}
              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
            />
          ),
        },
        {
          name: 'end_time',
          label: 'End Time',
          render: (field) => (
            <Input
              type="datetime-local"
              {...field}
              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
            />
          ),
        },
      ]}
    />
  );
}

type ShowDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ShowDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ShowDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Show"
      description="Are you sure you want to delete this show? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
