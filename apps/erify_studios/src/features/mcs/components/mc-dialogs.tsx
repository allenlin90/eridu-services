import type { z } from 'zod';

import type { McApiResponse } from '@eridu/api-types/mcs';
import {
  createMcInputSchema,
  updateMcInputSchema,
} from '@eridu/api-types/mcs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type Mc = McApiResponse;
type McFormData = z.infer<typeof createMcInputSchema>;
type UpdateMcFormData = z.infer<typeof updateMcInputSchema>;

type McCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: McFormData) => Promise<void>;
  isLoading: boolean;
};

export function McCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: McCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create MC"
      description="Add a new Master of Ceremonies to the system"
      schema={createMcInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter MC name',
        },
        {
          name: 'alias_name',
          label: 'Alias Name',
          placeholder: 'Enter alias name',
        },
        {
          name: 'user_id',
          label: 'User ID',
          placeholder: 'Enter User ID (optional)',
        },
      ]}
    />
  );
}

type McUpdateDialogProps = {
  mc: Mc | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateMcFormData) => Promise<void>;
  isLoading: boolean;
};

export function McUpdateDialog({
  mc,
  onOpenChange,
  onSubmit,
  isLoading,
}: McUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!mc}
      onOpenChange={onOpenChange}
      title="Edit MC"
      description="Update MC information"
      schema={updateMcInputSchema}
      defaultValues={
        mc
          ? {
              name: mc.name,
              alias_name: mc.alias_name,
              user_id: mc.user_id || undefined,
              is_banned: mc.is_banned,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter MC name',
        },
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={mc?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(mc?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
        {
          name: 'alias_name',
          label: 'Alias Name',
          placeholder: 'Enter alias name',
        },
        {
          name: 'user_id',
          label: 'User ID',
          placeholder: 'Enter User ID (optional)',
        },
        {
          name: 'is_banned',
          label: 'Status',
          render: (field) => (
            <Select
              value={field.value ? 'banned' : 'active'}
              onValueChange={(value) => field.onChange(value === 'banned')}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
      ]}
    />
  );
}

type McDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function McDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: McDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete MC"
      description="Are you sure you want to delete this MC? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
