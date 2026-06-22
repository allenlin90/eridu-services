import type { z } from 'zod';

import type { CreatorApiResponse } from '@eridu/api-types/creators';
import {
  createCreatorInputSchema,
  CREATOR_COMPENSATION_TYPE,
  CREATOR_TYPE,
  updateCreatorInputSchema,
} from '@eridu/api-types/creators';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { CreatorTypeSelect } from './creator-type-select';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type Creator = CreatorApiResponse;
type CreatorFormData = z.infer<typeof createCreatorInputSchema>;
type UpdateCreatorFormData = z.infer<typeof updateCreatorInputSchema>;

function CreatorCompensationTypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select compensation type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CREATOR_COMPENSATION_TYPE.FIXED}>Fixed</SelectItem>
        <SelectItem value={CREATOR_COMPENSATION_TYPE.COMMISSION}>Commission</SelectItem>
        <SelectItem value={CREATOR_COMPENSATION_TYPE.HYBRID}>Hybrid</SelectItem>
      </SelectContent>
    </Select>
  );
}

type CreatorCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatorFormData) => Promise<void>;
  isLoading: boolean;
};

export function CreatorCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreatorCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Creator"
      description="Add a new creator to the system"
      schema={createCreatorInputSchema}
      defaultValues={{
        type: CREATOR_TYPE.STANDARD,
      }}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter creator name',
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
          name: 'type',
          label: 'Type',
          render: (field) => (
            <CreatorTypeSelect
              value={field.value}
              onChange={field.onChange}
              disabled={isLoading}
            />
          ),
        },
        {
          name: 'default_rate',
          label: 'Default Rate',
          placeholder: '0.00',
          type: 'number',
        },
        {
          name: 'default_rate_type',
          label: 'Compensation Type',
          render: (field) => (
            <CreatorCompensationTypeSelect
              value={field.value}
              onChange={field.onChange}
              disabled={isLoading}
            />
          ),
        },
        {
          name: 'default_commission_rate',
          label: 'Default Commission Rate (%)',
          placeholder: '0.00',
          type: 'number',
        },
      ]}
    />
  );
}

type CreatorUpdateDialogProps = {
  creator: Creator | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateCreatorFormData) => Promise<void>;
  isLoading: boolean;
};

export function CreatorUpdateDialog({
  creator,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreatorUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!creator}
      onOpenChange={onOpenChange}
      title="Edit Creator"
      description="Update creator information"
      schema={updateCreatorInputSchema}
      defaultValues={
        creator
          ? {
              name: creator.name,
              alias_name: creator.alias_name,
              user_id: creator.user_id || undefined,
              is_banned: creator.is_banned,
              type: creator.type,
              default_rate: creator.default_rate ?? null,
              default_rate_type: creator.default_rate_type ?? null,
              default_commission_rate: creator.default_commission_rate ?? null,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter creator name',
        },
        {
          kind: 'render',
          id: 'id',
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={creator?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(creator?.id || '');
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
        {
          name: 'type',
          label: 'Type',
          render: (field) => (
            <CreatorTypeSelect
              value={field.value}
              onChange={field.onChange}
              disabled={isLoading}
            />
          ),
        },
        {
          name: 'default_rate',
          label: 'Default Rate',
          placeholder: '0.00',
          type: 'number',
        },
        {
          name: 'default_rate_type',
          label: 'Compensation Type',
          render: (field) => (
            <CreatorCompensationTypeSelect
              value={field.value}
              onChange={field.onChange}
              disabled={isLoading}
            />
          ),
        },
        {
          name: 'default_commission_rate',
          label: 'Default Commission Rate (%)',
          placeholder: '0.00',
          type: 'number',
        },
      ]}
    />
  );
}

type CreatorDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function CreatorDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: CreatorDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Creator"
      description="Are you sure you want to delete this creator? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
