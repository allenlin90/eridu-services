import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';
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
  PlatformCreateDialog,
  PlatformDeleteDialog,
  PlatformUpdateDialog,
} from '@/features/platforms/components/platform-dialogs';
import {
  platformColumns,
  platformSearchableColumns,
} from '@/features/platforms/config/platform-columns';
import { platformsSearchSchema } from '@/features/platforms/config/platform-search-schema';
import { usePlatforms } from '@/features/platforms/hooks/use-platforms';

export const Route = createFileRoute('/system/platforms/')({
  component: PlatformsList,
  validateSearch: (search) => platformsSearchSchema.parse(search),
});

type Platform = PlatformApiResponse;

function PlatformsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

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
  } = usePlatforms();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete platform:', error);
    }
  };

  const onCreateSubmit = async (formData: any) => {
    await createMutation.mutateAsync(formData);
    setIsCreateDialogOpen(false);
  };

  const onUpdateSubmit = async (formData: any) => {
    if (!editingPlatform)
      return;
    await updateMutation.mutateAsync({ id: editingPlatform.id, data: formData });
    setEditingPlatform(null);
  };

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<Platform>[]>(() => [
    ...platformColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(platform) => setEditingPlatform(platform)}
          onDelete={(platform) => setDeleteId(platform.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Platform>,
  ], []);

  return (
    <AdminLayout
      title="Platforms"
      description="Manage streaming platforms and their configurations"
      action={{
        label: 'Create Platform',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['platforms']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No platforms found. Create one to get started."
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
            searchableColumns={platformSearchableColumns}
            searchPlaceholder="Search platforms..."
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

      <PlatformCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={onCreateSubmit}
        isLoading={createMutation.isPending}
      />

      <PlatformUpdateDialog
        platform={editingPlatform}
        onOpenChange={(open) => !open && setEditingPlatform(null)}
        onSubmit={onUpdateSubmit}
        isLoading={updateMutation.isPending}
      />

      <PlatformDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
