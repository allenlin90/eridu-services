import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  adaptSortingChange,
  DataTable,
  DataTableActions,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
import type { Show } from '@/features/shows/api/get-shows';
import { usePlatformsFieldData } from '@/features/shows/components/hooks/use-platforms-field-data';
import { useShowStandardFieldData } from '@/features/shows/components/hooks/use-show-standard-field-data';
import { useShowStatusFieldData } from '@/features/shows/components/hooks/use-show-status-field-data';
import {
  ShowDeleteDialog,
  ShowUpdateDialog,
} from '@/features/shows/components/show-dialogs';
import {
  showColumns,
  showSearchableColumns,
} from '@/features/shows/config/show-columns';
import { showsSearchSchema } from '@/features/shows/config/show-search-schema';
import { useShows } from '@/features/shows/hooks/use-shows';

export const Route = createFileRoute('/system/shows/')({
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
    show_standard_name: search.show_standard_name,
    show_status_name: search.show_status_name,
    platform_name: search.platform_name,
  });

  // Fetch filter options using existing hooks
  // Pass null as show because we just want the list, not specific to an editing show
  const { options: standardOptions } = useShowStandardFieldData(null);
  const { options: statusOptions } = useShowStatusFieldData(null);
  const { options: platformOptions } = usePlatformsFieldData(null);

  // Construct dynamic searchableColumns
  const searchableColumns = useMemo(() => {
    return showSearchableColumns.map((col) => {
      switch (col.id) {
        case 'show_standard_name':
          return { ...col, options: standardOptions.map((o) => ({ value: o.label, label: o.label })) };
        case 'show_status_name':
          return { ...col, options: statusOptions.map((o) => ({ value: o.label, label: o.label })) };
        case 'platform_name':
          return { ...col, options: platformOptions.map((o) => ({ value: o.label, label: o.label })) };
        default:
          return col;
      }
    });
  }, [standardOptions, statusOptions, platformOptions]);

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

  const pagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : undefined;

  const columnsWithActions = useMemo<ColumnDef<Show>[]>(() => [
    ...showColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(show) => setEditingShow(show)}
          onDelete={(show) => setDeleteId(show.id)}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Show>,
  ], []);

  return (
    <AdminLayout
      title="Shows"
      description="Manage shows"
      onRefresh={handleRefresh}
      refreshQueryKey={['shows']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No shows found."
        manualPagination={!!pagination}
        manualFiltering
        manualSorting
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
        sorting={sorting}
        onSortingChange={adaptSortingChange(sorting, onSortingChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchableColumns={searchableColumns}
            searchPlaceholder="Search shows..."
            featuredFilterColumns={['show_standard_name', 'start_time']}
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
