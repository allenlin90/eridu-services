import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { UserApiResponse } from '@eridu/api-types/users';
import {
  createUserInputSchema,
  updateUserInputSchema,
} from '@eridu/api-types/users';
import {
  useTableUrlState,
} from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const usersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/users/')({
  component: UsersList,
  validateSearch: (search) => usersSearchSchema.parse(search),
});

// User type
type User = UserApiResponse;

type UserFormData = z.infer<typeof createUserInputSchema>;
type UpdateUserFormData = z.infer<typeof updateUserInputSchema>;

export function UsersList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const { pagination, onPaginationChange, setPageCount } = useTableUrlState({
    from: '/system/users/',
  });

  // Fetch users list
  const { data, isLoading, isFetching } = useAdminList<User>('users', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const createMutation = useAdminCreate<User, UserFormData>('users');
  const updateMutation = useAdminUpdate<User, UpdateUserFormData>('users');
  const deleteMutation = useAdminDelete('users');

  // Table columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'ext_id',
      header: 'External ID',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
  ];

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
  };

  const handleUpdate = async (data: UpdateUserFormData) => {
    if (!editingUser)
      return;
    await updateMutation.mutateAsync({ id: editingUser.id, data });
    setEditingUser(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('users'),
    });
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
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(user) => setEditingUser(user)}
        onDelete={(user) => setDeleteId(user.id)}
        emptyMessage="No users found. Create one to get started."
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

      <AdminFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create User"
        description="Add a new system user"
        schema={createUserInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
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

      <AdminFormDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        title="Edit User"
        description="Update user information"
        schema={updateUserInputSchema}
        defaultValues={
          editingUser
            ? {
                name: editingUser.name,
                email: editingUser.email,
                ext_id: editingUser.ext_id || undefined,
                profile_url: editingUser.profile_url || undefined,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
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
            name: 'id' as any, // Virtual field for display
            label: 'ID',
            render: () => (
              <div className="flex flex-col gap-2">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingUser?.id || ''}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(editingUser?.id || '');
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

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
