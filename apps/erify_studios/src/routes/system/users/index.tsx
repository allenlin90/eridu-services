import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  createUserInputSchema,
  updateUserInputSchema,
  UserApiResponse,
} from '@eridu/api-types/users';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  UserCreateDialog,
  UserDeleteDialog,
  UserUpdateDialog,
} from '@/features/users/components/user-dialogs';
import {
  userColumns,
  userSearchableColumns,
} from '@/features/users/config/user-columns';
import { usersSearchSchema } from '@/features/users/config/user-search-schema';
import { useUsers } from '@/features/users/hooks/use-users';
import { queryKeys } from '@/lib/api/query-keys';

export const Route = createFileRoute('/system/users/')({
  component: UsersList,
  validateSearch: (search) => usersSearchSchema.parse(search),
});

type User = UserApiResponse;
type UserFormData = z.infer<typeof createUserInputSchema>;
type UpdateUserFormData = z.infer<typeof updateUserInputSchema>;

export function UsersList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  } = useUsers();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleCreate = async (data: UserFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateUserFormData) => {
    if (!editingUser)
      return;
    await updateMutation.mutateAsync({ id: editingUser.id, data });
    setEditingUser(null);
  };

  return (
    <AdminLayout
      title="Users"
      description="Manage system users"
      action={{
        label: 'Create User',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('users')}
    >
      <AdminTable
        data={data?.data || []}
        columns={userColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(user) => setEditingUser(user)}
        onDelete={(user) => setDeleteId(user.id)}
        emptyMessage="No users found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={userSearchableColumns}
        searchPlaceholder="Search by name..."
        pagination={
          data?.meta
            ? {
                pageIndex: data.meta.page - 1,
                pageSize: data.meta.limit,
                total: data.meta.total,
                pageCount: data.meta.totalPages,
              }
            : undefined
        }
        onPaginationChange={onPaginationChange}
      />

      <UserCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <UserUpdateDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <UserDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
