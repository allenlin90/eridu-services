import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

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
  useTableUrlState,
} from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { CopyIdCell } from '@/features/admin/components/copy-id-cell';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const membershipsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/memberships/')({
  component: MembershipsList,
  validateSearch: (search) => membershipsSearchSchema.parse(search),
});

// Membership type
type Membership = MembershipApiResponse;

type MembershipFormData = z.infer<typeof createMembershipInputSchema>;
type UpdateMembershipFormData = z.infer<typeof updateMembershipInputSchema>;

function MembershipsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/memberships/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  // Fetch studio memberships list
  const { data, isLoading } = useAdminList<Membership>('studio-memberships', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    id: idFilter,
  });

  // Fetch studios for dropdown
  const { data: studiosData, isLoading: isLoadingStudios } = useAdminList<StudioApiResponse>('studios', {
    page: 1,
    limit: 100, // Fetch first 100 studios for now
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const createMutation = useAdminCreate<Membership, MembershipFormData>('studio-memberships');
  const updateMutation = useAdminUpdate<Membership, UpdateMembershipFormData>('studio-memberships');
  const deleteMutation = useAdminDelete('studio-memberships');

  // Table columns
  const columns: ColumnDef<Membership>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <CopyIdCell id={row.original.id} />,
    },
    {
      accessorKey: 'user_id',
      header: 'User ID',
    },
    {
      accessorKey: 'studio_id',
      header: 'Studio ID',
    },
    {
      accessorKey: 'role',
      header: 'Role',
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
      console.error('Failed to delete membership:', error);
    }
  };

  const handleCreate = async (data: MembershipFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: UpdateMembershipFormData) => {
    if (!editingMembership)
      return;
    await updateMutation.mutateAsync({ id: editingMembership.id, data });
    setEditingMembership(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('studio-memberships'),
    });
  };

  return (
    <AdminLayout
      title="Memberships"
      description="Manage studio memberships and user roles"
      action={{
        label: 'Create Membership',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('studio-memberships')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(membership) => setEditingMembership(membership)}
        onDelete={(membership) => setDeleteId(membership.id)}
        emptyMessage="No memberships found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={[
          { id: 'user_id', title: 'User ID' },
          { id: 'studio_id', title: 'Studio ID' },
          { id: 'id', title: 'ID' },
        ]}
        searchPlaceholder="Search by user or studio..."
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
        title="Create Membership"
        description="Add a new studio membership"
        schema={createMembershipInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
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
                disabled={createMutation.isPending || isLoadingStudios}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select studio" />
                </SelectTrigger>
                <SelectContent>
                  {studiosData?.data?.map((studio) => (
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
                disabled={createMutation.isPending}
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

      <AdminFormDialog
        open={!!editingMembership}
        onOpenChange={(open) => !open && setEditingMembership(null)}
        title="Edit Membership"
        description="Update membership information"
        schema={updateMembershipInputSchema}
        defaultValues={
          editingMembership
            ? {
                user_id: editingMembership.user_id || undefined,
                studio_id: editingMembership.studio_id || undefined,
                role: editingMembership.role,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
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
                disabled={updateMutation.isPending || isLoadingStudios}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select studio" />
                </SelectTrigger>
                <SelectContent>
                  {studiosData?.data?.map((studio) => (
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
                disabled={updateMutation.isPending}
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

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Membership"
        description="Are you sure you want to delete this membership? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
