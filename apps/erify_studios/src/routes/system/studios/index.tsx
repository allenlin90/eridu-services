import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DoorOpen } from 'lucide-react';
import { useState } from 'react';
import type { z } from 'zod';

import type {
  createStudioInputSchema,
  StudioApiResponse,
  updateStudioInputSchema,
} from '@eridu/api-types/studios';
import { DropdownMenuItem } from '@eridu/ui';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  StudioCreateDialog,
  StudioDeleteDialog,
  StudioUpdateDialog,
} from '@/features/studios/components/studio-dialogs';
import {
  studioSearchableColumns,
  useStudioColumns,
} from '@/features/studios/config/studio-columns';
import { studiosSearchSchema } from '@/features/studios/config/studio-search-schema';
import { useStudios } from '@/features/studios/hooks/use-studios';

export const Route = createFileRoute('/system/studios/')({
  component: StudiosList,
  validateSearch: (search) => studiosSearchSchema.parse(search),
});

type Studio = StudioApiResponse;
type StudioFormData = z.infer<typeof createStudioInputSchema>;
type UpdateStudioFormData = z.infer<typeof updateStudioInputSchema>;

export function StudiosList() {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);

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
  } = useStudios();

  const { studioColumns } = useStudioColumns();

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete studio:', error);
    }
  };

  const handleCreate = async (data: StudioFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateStudioFormData) => {
    if (!editingStudio)
      return;
    await updateMutation.mutateAsync({ id: editingStudio.id, data });
    setEditingStudio(null);
  };

  return (
    <AdminLayout
      title="Studios"
      description="Manage studios"
      action={{
        label: 'Create Studio',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={['studios']}
    >
      <AdminTable
        data={data?.data || []}
        columns={studioColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(studio) => setEditingStudio(studio)}
        onDelete={(studio) => setDeleteId(studio.id)}
        renderExtraActions={(studio) => (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              navigate({
                to: '/system/studios/$studioId/studio-rooms',
                params: { studioId: studio.id },
                search: { page: 1, pageSize: 10 },
              });
            }}
          >
            <DoorOpen className="mr-2 h-4 w-4" />
            View Rooms
          </DropdownMenuItem>
        )}
        emptyMessage="No studios found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={studioSearchableColumns}
        searchPlaceholder="Search studios..."
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

      <StudioCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <StudioUpdateDialog
        studio={editingStudio}
        onOpenChange={(open) => !open && setEditingStudio(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <StudioDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
