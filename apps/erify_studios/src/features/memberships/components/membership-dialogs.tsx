import type { z } from 'zod';

import type { MembershipApiResponse } from '@eridu/api-types/memberships';
import {
  createMembershipInputSchema,
  STUDIO_ROLE,
  updateMembershipInputSchema,
} from '@eridu/api-types/memberships';
import type { StudioApiResponse } from '@eridu/api-types/studios';
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

type Membership = MembershipApiResponse;
type MembershipFormData = z.infer<typeof createMembershipInputSchema>;
type UpdateMembershipFormData = z.infer<typeof updateMembershipInputSchema>;

type MembershipCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MembershipFormData) => Promise<void>;
  isLoading: boolean;
  studios: StudioApiResponse[];
  isLoadingStudios: boolean;
};

export function MembershipCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  studios,
  isLoadingStudios,
}: MembershipCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Membership"
      description="Add a new studio membership"
      schema={createMembershipInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'user_id',
          label: 'User ID',
          placeholder: 'Enter User ID',
        },
        {
          name: 'studio_id',
          label: 'Studio',
          render: (field) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isLoading || isLoadingStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select studio" />
              </SelectTrigger>
              <SelectContent>
                {studios?.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
        {
          name: 'role',
          label: 'Role',
          render: (field) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(STUDIO_ROLE).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
      ]}
    />
  );
}

type MembershipUpdateDialogProps = {
  membership: Membership | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateMembershipFormData) => Promise<void>;
  isLoading: boolean;
  studios: StudioApiResponse[];
  isLoadingStudios: boolean;
};

export function MembershipUpdateDialog({
  membership,
  onOpenChange,
  onSubmit,
  isLoading,
  studios,
  isLoadingStudios,
}: MembershipUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!membership}
      onOpenChange={onOpenChange}
      title="Edit Membership"
      description="Update membership information"
      schema={updateMembershipInputSchema}
      defaultValues={
        membership
          ? {
              user_id: membership.user_id || undefined,
              studio_id: membership.studio_id || undefined,
              role: membership.role,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'user_id',
          label: 'User ID',
          placeholder: 'Enter User ID',
        },
        {
          name: 'studio_id',
          label: 'Studio',
          render: (field) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isLoading || isLoadingStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select studio" />
              </SelectTrigger>
              <SelectContent>
                {studios?.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
        {
          name: 'role',
          label: 'Role',
          render: (field) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(STUDIO_ROLE).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
      ]}
    />
  );
}

type MembershipDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function MembershipDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: MembershipDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Membership"
      description="Are you sure you want to delete this membership? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
