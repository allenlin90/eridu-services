import type { z } from 'zod';

import type { ShowStandardApiResponse } from '@eridu/api-types/show-standards';
import {
  createShowStandardInputSchema,
  updateShowStandardInputSchema,
} from '@eridu/api-types/show-standards';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type ShowStandard = ShowStandardApiResponse;
type ShowStandardFormData = z.infer<typeof createShowStandardInputSchema>;
type UpdateShowStandardFormData = z.infer<typeof updateShowStandardInputSchema>;

type ShowStandardCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShowStandardFormData) => Promise<void>;
  isLoading: boolean;
};

export function ShowStandardCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowStandardCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Show Standard"
      description="Add a new show standard to the system"
      schema={createShowStandardInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter show standard name',
        },
      ]}
    />
  );
}

type ShowStandardUpdateDialogProps = {
  showStandard: ShowStandard | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateShowStandardFormData) => Promise<void>;
  isLoading: boolean;
};

export function ShowStandardUpdateDialog({
  showStandard,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowStandardUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!showStandard}
      onOpenChange={onOpenChange}
      title="Edit Show Standard"
      description="Update show standard information"
      schema={updateShowStandardInputSchema}
      defaultValues={showStandard ? { name: showStandard.name } : undefined}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter show standard name',
        },
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={showStandard?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(showStandard?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
      ]}
    />
  );
}

type ShowStandardDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ShowStandardDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ShowStandardDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Show Standard"
      description="Are you sure you want to delete this show standard? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
