import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  createMembershipInputSchema,
  MembershipApiResponse,
  updateMembershipInputSchema,
} from '@eridu/api-types/memberships';
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

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<Membership>[]>(() => [
    ...membershipColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(membership) => setEditingMembership(membership)}
          onDelete={(membership) => setDeleteId(membership.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Membership>,
  ], []);

  return (
    <AdminLayout
      title="Memberships"
      description="Manage studio memberships and user roles"
      action={{
        label: 'Create Membership',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['memberships']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        emptyMessage="No memberships found. Create one to get started."
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
            searchableColumns={membershipSearchableColumns}
            searchPlaceholder="Search by user or studio..."
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
