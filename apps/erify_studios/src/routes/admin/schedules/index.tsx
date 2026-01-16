import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { ScheduleApiResponse } from '@eridu/api-types/schedules';
import { Button, useTableUrlState } from '@eridu/ui';

import {
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { CopyIdCell } from '@/features/admin/components/copy-id-cell';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDelete,
  useAdminList,
} from '@/lib/hooks/use-admin-crud';

const schedulesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/admin/schedules/')({
  component: SchedulesList,
  validateSearch: (search) => schedulesSearchSchema.parse(search),
});

// Basic schedule type matching API response
type Schedule = ScheduleApiResponse;

function SchedulesList() {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/admin/schedules/',
    paramNames: {
      search: 'name',
    },
  });

  const search = Route.useSearch();

  // Fetch schedules list
  const { data, isLoading } = useAdminList<Schedule>('schedules', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: search.name,
    client_name: search.client_name,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const deleteMutation = useAdminDelete('schedules');

  // Table columns
  const columns: ColumnDef<Schedule>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <CopyIdCell id={row.original.id} />,
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
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'version',
      header: 'Version',
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => new Date(row.original.start_date).toLocaleString(),
    },
    {
      id: 'actions-snapshots',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate({
              to: '/admin/schedules/$scheduleId/snapshots',
              params: { scheduleId: row.original.id },
              search: { page: 1, pageSize: 10 },
            });
          }}
        >
          <History className="mr-2 h-4 w-4" />
          Snapshots
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!deleteId)
      return;

    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('schedules'),
    });
  };

  return (
    <AdminLayout
      title="Schedules"
      description="Manage schedules"
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('schedules')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onDelete={(schedule) => setDeleteId(schedule.id)}
        emptyMessage="No schedules found."
        searchColumn="name"
        searchableColumns={[
          { id: 'name', title: 'Name' },
          { id: 'client_name', title: 'Client' },
        ]}
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
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Schedule"
        description="Are you sure you want to delete this schedule? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
