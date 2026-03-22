import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { DoorOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type {
  createStudioInputSchema,
  StudioApiResponse,
  updateStudioInputSchema,
} from '@eridu/api-types/studios';
import { adaptColumnFiltersChange, adaptPaginationChange, DataTable, DataTableActions, DataTablePagination, DataTableToolbar, DropdownMenuItem } from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
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
    } catch {
      // Global mutation error handler already shows user-facing feedback.
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

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<Studio>[]>(() => [
    ...studioColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
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
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Studio>,
  ], [navigate, studioColumns]);

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
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No studios found. Create one to get started."
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
            searchableColumns={studioSearchableColumns}
            searchPlaceholder="Search studios..."
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
