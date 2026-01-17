import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { ScheduleApiResponse } from '@eridu/api-types/schedules';
import { updateScheduleInputSchema } from '@eridu/api-types/schedules';
import {
  DropdownMenuItem,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTableUrlState,
} from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { CopyIdCell } from '@/features/admin/components/copy-id-cell';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const schedulesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/admin/schedules/')({
  component: SchedulesList,
  validateSearch: (search) => schedulesSearchSchema.parse(search),
});

// Basic schedule type matching API response
type Schedule = ScheduleApiResponse;
type UpdateScheduleFormData = z.infer<typeof updateScheduleInputSchema>;

function SchedulesList() {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

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
  const { data, isLoading, isFetching } = useAdminList<Schedule>('schedules', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: search.name,
    client_name: search.client_name,
    id: search.id,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const updateMutation = useAdminUpdate<Schedule, UpdateScheduleFormData>('schedules');
  const deleteMutation = useAdminDelete('schedules');

  // Table columns
  const columns: ColumnDef<Schedule>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <CopyIdCell id={row.original.id} />,
      meta: {
        className: 'hidden xl:table-cell',
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          <span className="block text-xs text-muted-foreground md:hidden">
            {row.original.client_name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'client_name',
      header: 'Client',
      meta: {
        className: 'hidden md:table-cell',
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'version',
      header: 'Version',
      meta: {
        className: 'hidden lg:table-cell',
      },
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => new Date(row.original.start_date).toLocaleString(),
      meta: {
        className: 'hidden md:table-cell',
      },
    },
  ];

  const handleDelete = async () => {
    if (!deleteId)
      return;

    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleUpdate = async (data: UpdateScheduleFormData) => {
    if (!editingSchedule)
      return;
    await updateMutation.mutateAsync({ id: editingSchedule.id, data });
    setEditingSchedule(null);
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
        isFetching={isFetching}
        onEdit={(schedule) => setEditingSchedule(schedule)}
        onDelete={(schedule) => setDeleteId(schedule.id)}
        renderExtraActions={(schedule) => (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              navigate({
                to: '/admin/schedules/$scheduleId/snapshots',
                params: { scheduleId: schedule.id },
                search: { page: 1, pageSize: 10 },
              });
            }}
          >
            <History className="mr-2 h-4 w-4" />
            View Snapshots
          </DropdownMenuItem>
        )}
        emptyMessage="No schedules found."
        searchColumn="name"
        searchableColumns={[
          { id: 'name', title: 'Name' },
          { id: 'client_name', title: 'Client' },
          { id: 'id', title: 'ID' },
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

      <AdminFormDialog
        open={!!editingSchedule}
        onOpenChange={(open) => !open && setEditingSchedule(null)}
        title="Edit Schedule"
        description="Update schedule details"
        schema={updateScheduleInputSchema}
        defaultValues={
          editingSchedule
            ? {
                name: editingSchedule.name,
                status: editingSchedule.status as 'draft' | 'review' | 'published',
                start_date: editingSchedule.start_date,
                end_date: editingSchedule.end_date,
                version: editingSchedule.version,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            // 'id' is NOT in updateScheduleInputSchema, so we must cast it.
            name: 'id' as any,
            label: 'ID',
            render: () => (
              <div className="flex flex-col gap-2">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingSchedule?.id || ''}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(editingSchedule?.id || '');
                  }}
                  title="Click to copy ID"
                />
              </div>
            ),
          },
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Schedule name',
          },
          {
            name: 'status',
            label: 'Status',
            render: (field) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            ),
          },
          {
            name: 'start_date',
            label: 'Start Date',
            render: (field) => (
              <Input
                type="datetime-local"
                {...field}
                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
              />
            ),
          },
          {
            name: 'end_date',
            label: 'End Date',
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
        title="Delete Schedule"
        description="Are you sure you want to delete this schedule? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
