import type { z } from 'zod';

import type { UserApiResponse } from '@eridu/api-types/users';
import {
  createUserInputSchema,
  updateUserInputSchema,
} from '@eridu/api-types/users';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type User = UserApiResponse;
type UserFormData = z.infer<typeof createUserInputSchema>;
type UpdateUserFormData = z.infer<typeof updateUserInputSchema>;

type UserCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading: boolean;
};

export function UserCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: UserCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create User"
      description="Add a new system user"
      schema={createUserInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'User Name',
        },
        {
          name: 'ext_id',
          label: 'External ID',
          placeholder: 'SSO ID',
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'user@example.com',
        },
        {
          name: 'profile_url',
          label: 'Profile URL',
          placeholder: 'https://example.com/profile.jpg',
        },
      ]}
    />
  );
}

type UserUpdateDialogProps = {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateUserFormData) => Promise<void>;
  isLoading: boolean;
};

export function UserUpdateDialog({
  user,
  onOpenChange,
  onSubmit,
  isLoading,
}: UserUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!user}
      onOpenChange={onOpenChange}
      title="Edit User"
      description="Update user information"
      schema={updateUserInputSchema}
      defaultValues={
        user
          ? {
              name: user.name,
              email: user.email,
              ext_id: user.ext_id || undefined,
              profile_url: user.profile_url || undefined,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'User Name',
        },
        {
          name: 'ext_id',
          label: 'External ID',
          placeholder: 'SSO ID',
        },
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={user?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(user?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'user@example.com',
        },
        {
          name: 'profile_url',
          label: 'Profile URL',
          placeholder: 'https://example.com/profile.jpg',
        },
      ]}
    />
  );
}

type UserDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function UserDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: UserDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete User"
      description="Are you sure you want to delete this user? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
