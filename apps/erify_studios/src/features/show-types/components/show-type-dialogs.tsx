import type {
  CreateShowTypeInput,
  ShowTypeApiResponse,
  UpdateShowTypeInput,
} from '@eridu/api-types/show-types';
import {
  createShowTypeInputSchema,
  updateShowTypeInputSchema,
} from '@eridu/api-types/show-types';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type ShowType = ShowTypeApiResponse;

type ShowTypeCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateShowTypeInput) => Promise<void>;
  isLoading: boolean;
};

export function ShowTypeCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowTypeCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Show Type"
      description="Add a new show type to the system"
      schema={createShowTypeInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter show type name',
        },
      ]}
    />
  );
}

type ShowTypeUpdateDialogProps = {
  showType: ShowType | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateShowTypeInput) => Promise<void>;
  isLoading: boolean;
};

export function ShowTypeUpdateDialog({
  showType,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowTypeUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!showType}
      onOpenChange={onOpenChange}
      title="Edit Show Type"
      description="Update show type information"
      schema={updateShowTypeInputSchema}
      defaultValues={showType ? { name: showType.name } : undefined}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter show type name',
        },
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={showType?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(showType?.id || '');
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

type ShowTypeDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ShowTypeDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ShowTypeDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Show Type"
      description="Are you sure you want to delete this show type? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
