import { createFileRoute } from '@tanstack/react-router';
import { Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { DeleteConfirmDialog } from '@/features/admin/components';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { useCreateStudioShow } from '@/features/studio-shows/api/create-studio-show';
import { useDeleteStudioShow } from '@/features/studio-shows/api/delete-studio-show';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { useUpdateStudioShow } from '@/features/studio-shows/api/update-studio-show';
import { getStudioShowManagementColumns } from '@/features/studio-shows/components/studio-show-management-columns';
import { StudioShowManagementForm } from '@/features/studio-shows/components/studio-show-management-form';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';
import { useStudioShowManagement } from '@/features/studio-shows/hooks/use-studio-show-management';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/shows/')({
  component: StudioShowsPage,
});

function StudioShowsPage() {
  const { studioId } = Route.useParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<StudioShow | null>(null);
  const [deletingShow, setDeletingShow] = useState<StudioShow | null>(null);
  const { role } = useStudioAccess(studioId);

  const {
    data,
    meta,
    isLoading,
    isFetching,
    refetch,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
  } = useStudioShowManagement(studioId);
  const { data: showLookups, isLoading: isLoadingLookups } = useShowLookupsQuery(studioId);
  const createMutation = useCreateStudioShow(studioId);
  const updateMutation = useUpdateStudioShow(studioId);
  const deleteMutation = useDeleteStudioShow(studioId);
  const canDeleteShows = role === STUDIO_ROLE.ADMIN;

  const editingShowQuery = useStudioShow({
    studioId,
    showId: editingShow?.id ?? '',
    enabled: Boolean(editingShow?.id),
  });

  const searchableColumns = useMemo(
    () => [
      { id: 'name', title: 'Name', type: 'text' as const },
      { id: 'client_name', title: 'Client', type: 'text' as const },
      { id: 'creator_name', title: 'Creator', type: 'text' as const },
      {
        id: 'show_type_name',
        title: 'Show Type',
        type: 'select' as const,
        options: (showLookups?.show_types ?? []).map((item) => ({ value: item.name, label: item.name })),
      },
      {
        id: 'show_standard_name',
        title: 'Show Standard',
        type: 'select' as const,
        options: (showLookups?.show_standards ?? []).map((item) => ({ value: item.name, label: item.name })),
      },
      {
        id: 'show_status_name',
        title: 'Show Status',
        type: 'select' as const,
        options: (showLookups?.show_statuses ?? []).map((item) => ({ value: item.name, label: item.name })),
      },
      {
        id: 'platform_name',
        title: 'Platform',
        type: 'select' as const,
        options: (showLookups?.platforms ?? []).map((item) => ({ value: item.name, label: item.name })),
      },
      {
        id: 'has_schedule',
        title: 'Schedule',
        type: 'select' as const,
        options: [
          { value: 'true', label: 'Assigned' },
          { value: 'false', label: 'Orphan' },
        ],
      },
      { id: 'start_time', title: 'Date', type: 'date-range' as const },
    ],
    [showLookups],
  );

  const columns = useMemo(
    () => getStudioShowManagementColumns(studioId, {
      onEdit: (show) => setEditingShow(show),
      onDelete: canDeleteShows
        ? (show) => setDeletingShow(show)
        : undefined,
    }),
    [canDeleteShows, studioId],
  );

  return (
    <PageLayout
      title="Shows"
      description="Manage studio shows in a dedicated CRUD view, including schedule reassignment for orphan shows."
    >
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No shows found."
        manualPagination
        manualFiltering
        pageCount={meta?.totalPages ?? 0}
        paginationState={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchableColumns={searchableColumns}
            searchPlaceholder="Search shows..."
            featuredFilterColumns={['show_status_name', 'has_schedule', 'start_time']}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
              aria-label="Refresh shows"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Show
            </Button>
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              total: meta?.total ?? 0,
              pageCount: meta?.totalPages ?? 0,
            }}
            onPaginationChange={onPaginationChange}
          />
        )}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Show</DialogTitle>
            <DialogDescription>Create a studio show without entering the operations workflow.</DialogDescription>
          </DialogHeader>
          <StudioShowManagementForm
            showLookups={showLookups}
            isLookupsLoading={isLoadingLookups}
            isSubmitting={createMutation.isPending}
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={(values) => {
              createMutation.mutate(values, {
                onSuccess: () => setIsCreateOpen(false),
              });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingShow)} onOpenChange={(open) => !open && setEditingShow(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Show</DialogTitle>
            <DialogDescription>Update the core show record without entering show operations.</DialogDescription>
          </DialogHeader>
          <StudioShowManagementForm
            show={editingShowQuery.data}
            showLookups={showLookups}
            isLookupsLoading={isLoadingLookups || editingShowQuery.isLoading}
            isSubmitting={updateMutation.isPending}
            onCancel={() => setEditingShow(null)}
            onSubmit={(values) => {
              if (!editingShow) {
                return;
              }

              // Empty schedule_id means "no change" for orphan shows — strip it so
              // the PATCH body omits the field rather than sending an invalid value.
              const { schedule_id, ...rest } = values;
              updateMutation.mutate({
                showId: editingShow.id,
                data: schedule_id ? { ...rest, schedule_id } : rest,
              }, {
                onSuccess: () => setEditingShow(null),
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {canDeleteShows && (
        <DeleteConfirmDialog
          open={Boolean(deletingShow)}
          onOpenChange={(open) => !open && setDeletingShow(null)}
          onConfirm={() => {
            if (!deletingShow) {
              return;
            }

            deleteMutation.mutate(deletingShow.id, {
              onSuccess: () => setDeletingShow(null),
            });
          }}
          title="Delete Show"
          description="Delete this show before it starts. After the start time, studio deletion is blocked."
          isLoading={deleteMutation.isPending}
        />
      )}
    </PageLayout>
  );
}
