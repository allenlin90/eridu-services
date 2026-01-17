import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  createMembershipInputSchema,
  MembershipApiResponse,
  updateMembershipInputSchema,
} from '@eridu/api-types/memberships';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  MembershipCreateDialog,
  MembershipDeleteDialog,
  MembershipUpdateDialog,
} from '@/features/memberships/components/membership-dialogs';
import {
  membershipColumns,
  membershipSearchableColumns,
} from '@/features/memberships/config/membership-columns';
import { membershipsSearchSchema } from '@/features/memberships/config/membership-search-schema';
import { useMemberships } from '@/features/memberships/hooks/use-memberships';
import { queryKeys } from '@/lib/api/query-keys';

export const Route = createFileRoute('/system/memberships/')({
  component: MembershipsList,
  validateSearch: (search) => membershipsSearchSchema.parse(search),
});

type Membership = MembershipApiResponse;
type MembershipFormData = z.infer<typeof createMembershipInputSchema>;
type UpdateMembershipFormData = z.infer<typeof updateMembershipInputSchema>;

function MembershipsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);

  const {
    data,
    isLoading,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    studiosData,
    isLoadingStudios,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  } = useMemberships();

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
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateMembershipFormData) => {
    if (!editingMembership)
      return;
    await updateMutation.mutateAsync({ id: editingMembership.id, data });
    setEditingMembership(null);
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
        columns={membershipColumns}
        isLoading={isLoading}
        onEdit={(membership) => setEditingMembership(membership)}
        onDelete={(membership) => setDeleteId(membership.id)}
        emptyMessage="No memberships found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={membershipSearchableColumns}
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

      <MembershipCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        studios={studiosData?.data || []}
        isLoadingStudios={isLoadingStudios}
      />

      <MembershipUpdateDialog
        membership={editingMembership}
        onOpenChange={(open) => !open && setEditingMembership(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        studios={studiosData?.data || []}
        isLoadingStudios={isLoadingStudios}
      />

      <MembershipDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
