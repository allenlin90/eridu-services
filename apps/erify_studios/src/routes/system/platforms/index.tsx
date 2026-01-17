import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';

import { AdminLayout, AdminTable } from '@/features/admin/components';
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
import { queryKeys } from '@/lib/api/query-keys';

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
    handleCreate,
    handleUpdate,
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
    await handleCreate(formData);
    setIsCreateDialogOpen(false);
  };

  const onUpdateSubmit = async (formData: any) => {
    if (!editingPlatform)
      return;
    await handleUpdate(editingPlatform.id, formData);
    setEditingPlatform(null);
  };

  return (
    <AdminLayout
      title="Platforms"
      description="Manage streaming platforms and their configurations"
      action={{
        label: 'Create Platform',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('platforms')}
    >
      <AdminTable
        data={data?.data || []}
        columns={platformColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(platform) => setEditingPlatform(platform)}
        onDelete={(platform) => setDeleteId(platform.id)}
        emptyMessage="No platforms found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={platformSearchableColumns}
        searchPlaceholder="Search platforms..."
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
