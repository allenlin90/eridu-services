import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { History } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { z } from 'zod';

import type { ScheduleApiResponse, updateScheduleInputSchema } from '@eridu/api-types/schedules';
import { adaptColumnFiltersChange, adaptPaginationChange, DataTable, DataTableActions, DataTablePagination, DataTableToolbar, DropdownMenuItem } from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
import {
  ScheduleDeleteDialog,
  ScheduleUpdateDialog,
} from '@/features/schedules/components/schedule-dialogs';
import {
  scheduleColumns,
  scheduleSearchableColumns,
} from '@/features/schedules/config/schedule-columns';
import { schedulesSearchSchema } from '@/features/schedules/config/schedule-search-schema';
import { useSchedules } from '@/features/schedules/hooks/use-schedules';

export const Route = createFileRoute('/system/schedules/')({
  component: SchedulesList,
  validateSearch: (search) => schedulesSearchSchema.parse(search),
});

type Schedule = ScheduleApiResponse;
type UpdateScheduleFormData = z.infer<typeof updateScheduleInputSchema>;

function SchedulesList() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    updateMutation,
    deleteMutation,
    handleRefresh,
  } = useSchedules({
    name: search.name,
    client_name: search.client_name,
    id: search.id,
  });

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Mutation-level error handling already surfaces user feedback.
    }
  };

  const handleUpdate = async (data: UpdateScheduleFormData) => {
    if (!editingSchedule)
      return;
    await updateMutation.mutateAsync({ id: editingSchedule.id, data });
    setEditingSchedule(null);
  };

  const tablePagination = data?.meta
    ? {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.limit,
        total: data.meta.total,
        pageCount: data.meta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  const columnsWithActions = useMemo<ColumnDef<Schedule>[]>(() => [
    ...scheduleColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(schedule) => setEditingSchedule(schedule)}
          onDelete={(schedule) => setDeleteId(schedule.id)}
          renderExtraActions={(schedule) => (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate({
                  to: '/system/schedules/$scheduleId/snapshots',
                  params: { scheduleId: schedule.id },
                  search: { page: 1, limit: 10 },
                });
              }}
            >
              <History className="mr-2 h-4 w-4" />
              View Snapshots
            </DropdownMenuItem>
          )}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<Schedule>,
  ], [navigate]);

  return (
    <AdminLayout
      title="Schedules"
      description="Manage schedules"
      onRefresh={handleRefresh}
      refreshQueryKey={['schedules']}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No schedules found."
        manualPagination
        manualFiltering
        pageCount={data?.meta?.totalPages}
        paginationState={{
          pageIndex: tablePagination.pageIndex,
          pageSize: tablePagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(tablePagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchableColumns={scheduleSearchableColumns}
            searchColumn="name"
          />
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={tablePagination}
            onPaginationChange={onPaginationChange}
          />
        )}
      />

      <ScheduleUpdateDialog
        schedule={editingSchedule}
        onOpenChange={(open) => !open && setEditingSchedule(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ScheduleDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
