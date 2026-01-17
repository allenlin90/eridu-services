import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import {
  ShowDeleteDialog,
  ShowUpdateDialog,
} from '@/features/shows/components/show-dialogs';
import type { Show } from '@/features/shows/config/show-columns';
import {
  showColumns,
  showSearchableColumns,
} from '@/features/shows/config/show-columns';
import { showsSearchSchema } from '@/features/shows/config/show-search-schema';
import { useShows } from '@/features/shows/hooks/use-shows';
import { queryKeys } from '@/lib/api/query-keys';

export const Route = createFileRoute('/admin/shows/')({
  component: ShowsList,
  validateSearch: (search) => showsSearchSchema.parse(search),
});

type UpdateShowFormData = z.infer<typeof updateShowInputSchema>;

function ShowsList() {
  const search = Route.useSearch();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingShow, setEditingShow] = useState<Show | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    updateMutation,
    deleteMutation,
    handleRefresh,
  } = useShows({
    name: search.name,
    client_name: search.client_name,
    mc_name: search.mc_name,
    start_date_from: search.start_date_from,
    start_date_to: search.start_date_to,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    id: search.id,
  });

  const handleDelete = async () => {
    if (!deleteId)
      return;

    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleUpdate = async (data: UpdateShowFormData) => {
    if (!editingShow)
      return;
    await updateMutation.mutateAsync({ id: editingShow.id, data });
    setEditingShow(null);
  };

  return (
    <AdminLayout
      title="Shows"
      description="Manage shows"
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('shows')}
    >
      <AdminTable
        data={data?.data || []}
        columns={showColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(show) => setEditingShow(show)}
        onDelete={(show) => setDeleteId(show.id)}
        emptyMessage="No shows found."
        searchColumn="name"
        searchableColumns={showSearchableColumns}
        searchPlaceholder="Search shows..."
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
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        onPaginationChange={onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />

      <ShowUpdateDialog
        show={editingShow}
        onOpenChange={(open) => !open && setEditingShow(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ShowDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
