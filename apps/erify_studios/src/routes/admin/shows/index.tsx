import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { ShowApiResponse } from '@eridu/api-types/shows';
import { updateShowInputSchema } from '@eridu/api-types/shows';
import { Input, useTableUrlState } from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import {
  CopyIdCell,
  DateCell,
  ItemsList,
  PlatformList,
  ShowStatusBadge,
  ShowTypeBadge,
} from '@/features/admin/components/show-table-cells';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const showsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  mc_name: z.string().optional().catch(undefined),
  start_date_from: z.string().optional().catch(undefined),
  start_date_to: z.string().optional().catch(undefined),
  sortBy: z.string().default('start_time').catch('start_time'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/admin/shows/')({
  component: ShowsList,
  validateSearch: (search) => showsSearchSchema.parse(search),
});

type Show = ShowApiResponse & {
  mcs: { mc_name: string }[];
  platforms: { platform_name: string }[];
};
type UpdateShowFormData = z.infer<typeof updateShowInputSchema>;

const TABLE_OPTIONS = {
  from: '/admin/shows/',
  dateColumnId: 'start_time',
  paramNames: {
    search: 'name',
    startDate: 'start_date_from',
    endDate: 'start_date_to',
  },
  defaultSorting: [{ id: 'start_time', desc: true }],
};

function ShowsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingShow, setEditingShow] = useState<Show | null>(null);

  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  } = useTableUrlState(TABLE_OPTIONS);

  const search = Route.useSearch();

  const { data, isLoading, isFetching } = useAdminList<Show>('shows', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: search.name,
    client_name: search.client_name,
    mc_name: search.mc_name,
    start_date_from: search.start_date_from,
    start_date_to: search.start_date_to,
    order_by: search.sortBy,
    order_direction: search.sortOrder,
    id: search.id,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const updateMutation = useAdminUpdate<Show, UpdateShowFormData>('shows');
  const deleteMutation = useAdminDelete('shows');

  const columns: ColumnDef<Show>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <CopyIdCell id={row.original.id} />,
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.name}</span>
          <div className="flex">
            <ShowTypeBadge type={row.original.show_type_name || undefined} />
          </div>
        </div>
      ),
    },
    {
      id: 'client_name',
      header: 'Client / Room',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.client_name}</span>
          <span className="text-xs text-muted-foreground">{row.original.studio_room_name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'show_status_name',
      header: 'Status',
      cell: ({ row }) => <ShowStatusBadge status={row.original.show_status_name || 'unknown'} />,
    },
    {
      id: 'mc_name',
      header: 'MCs',
      cell: ({ row }) => (
        <ItemsList
          items={row.original.mcs?.map((mc) => mc.mc_name || '').filter((n) => n.length > 0) || []}
          label="MCs"
        />
      ),
      enableSorting: false,
    },
    {
      id: 'platforms',
      header: 'Platforms',
      cell: ({ row }) => (
        <PlatformList
          items={row.original.platforms?.map((p) => p.platform_name || '').filter((n) => n.length > 0) || []}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => <DateCell date={row.original.start_time} />,
    },
  ];

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('shows'),
    });
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
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={(show) => setEditingShow(show)}
        onDelete={(show) => setDeleteId(show.id)}
        emptyMessage="No shows found."
        searchColumn="name"
        searchableColumns={[
          { id: 'name', title: 'Name', type: 'text' },
          { id: 'client_name', title: 'Client', type: 'text' },
          { id: 'mc_name', title: 'MC', type: 'text' },
          { id: 'start_time', title: 'Date', type: 'date-range' },
          { id: 'id', title: 'ID', type: 'text' },
        ]}
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

      <AdminFormDialog
        open={!!editingShow}
        onOpenChange={(open) => !open && setEditingShow(null)}
        title="Edit Show"
        description="Update show details"
        schema={updateShowInputSchema}
        defaultValues={
          editingShow
            ? {
                name: editingShow.name,
                start_time: editingShow.start_time,
                end_time: editingShow.end_time,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            // 'id' is NOT in updateShowInputSchema, so we must cast it.
            name: 'id' as any,
            label: 'ID',
            render: () => (
              <div className="flex flex-col gap-2">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingShow?.id || ''}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(editingShow?.id || '');
                  }}
                  title="Click to copy ID"
                />
              </div>
            ),
          },
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Show name',
          },
          {
            name: 'start_time',
            label: 'Start Time',
            render: (field) => (
              <Input
                type="datetime-local"
                {...field}
                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
              />
            ),
          },
          {
            name: 'end_time',
            label: 'End Time',
            render: (field) => (
              <Input
                type="datetime-local"
                {...field}
                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
              />
            ),
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Show"
        description="Are you sure you want to delete this show? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
