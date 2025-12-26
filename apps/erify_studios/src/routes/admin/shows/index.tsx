import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { ShowApiResponse } from '@eridu/api-types/shows';
import { useTableUrlState } from '@eridu/ui';

import {
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDelete,
  useAdminList,
} from '@/lib/hooks/use-admin-crud';

const showsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/admin/shows/')({
  component: ShowsList,
  validateSearch: (search) => showsSearchSchema.parse(search),
});

// Basic show type matching API response
type Show = ShowApiResponse;

function ShowsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const { pagination, onPaginationChange, setPageCount } = useTableUrlState({
    from: '/admin/shows/',
  });

  // Fetch shows list
  const { data, isLoading } = useAdminList<Show>('shows', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const deleteMutation = useAdminDelete('shows');

  // Table columns
  const columns: ColumnDef<Show>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'client_name',
      header: 'Client',
    },
    {
      accessorKey: 'studio_room_name',
      header: 'Room',
    },
    {
      accessorKey: 'show_status_name',
      header: 'Status',
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => new Date(row.original.start_time).toLocaleString(),
    },
  ];

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete show:', error);
    }
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
        onDelete={(show) => setDeleteId(show.id)}
        emptyMessage="No shows found."
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
