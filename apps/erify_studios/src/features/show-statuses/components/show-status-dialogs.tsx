import type {
  CreateShowStatusInput,
  ShowStatusApiResponse,
  UpdateShowStatusInput,
} from '@eridu/api-types/show-statuses';
import {
  createShowStatusInputSchema,
  updateShowStatusInputSchema,
} from '@eridu/api-types/show-statuses';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type ShowStatus = ShowStatusApiResponse;

type ShowStatusCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateShowStatusInput) => Promise<void>;
  isLoading: boolean;
};

export function ShowStatusCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowStatusCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Show Status"
      description="Add a new show status to the system"
      schema={createShowStatusInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter show status name',
        },
      ]}
    />
  );
}

type ShowStatusUpdateDialogProps = {
  showStatus: ShowStatus | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateShowStatusInput) => Promise<void>;
  isLoading: boolean;
};

export function ShowStatusUpdateDialog({
  showStatus,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowStatusUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!showStatus}
      onOpenChange={onOpenChange}
      title="Edit Show Status"
      description="Update show status information"
      schema={updateShowStatusInputSchema}
      defaultValues={showStatus ? { name: showStatus.name } : undefined}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter show status name',
        },
        {
          kind: 'render',
          id: 'id',
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={showStatus?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(showStatus?.id || '');
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

type ShowStatusDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ShowStatusDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ShowStatusDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Show Status"
      description="Are you sure you want to delete this show status? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
