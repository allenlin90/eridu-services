import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  createUserInputSchema,
  updateUserInputSchema,
  UserApiResponse,
} from '@eridu/api-types/users';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  DataTable,
  DataTableActions,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
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
    } catch {
      // Global mutation error handler already shows user-facing feedback.
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

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<User>[]>(() => [
    ...userColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(user) => setEditingUser(user)}
          onDelete={(user) => setDeleteId(user.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<User>,
  ], []);

  return (
    <AdminLayout
      title="Users"
      description="Manage system users"
      action={{
        label: 'Create User',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['users']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No users found. Create one to get started."
        manualPagination={!!pagination}
        manualFiltering
        pageCount={pagination?.pageCount}
        paginationState={pagination
          ? {
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            }
          : undefined}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchableColumns={userSearchableColumns}
            searchPlaceholder="Search by name..."
            featuredFilterColumns={['is_system_admin']}
          />
        )}
        renderFooter={() => pagination
          ? (
              <DataTablePagination
                pagination={pagination}
                onPaginationChange={onPaginationChange}
              />
            )
          : null}
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
