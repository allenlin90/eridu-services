import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { History } from 'lucide-react';
import { useState } from 'react';
import type { z } from 'zod';

import type { ScheduleApiResponse, updateScheduleInputSchema } from '@eridu/api-types/schedules';
import { DropdownMenuItem } from '@eridu/ui';

import { AdminLayout, AdminTable } from '@/features/admin/components';
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
import { queryKeys } from '@/lib/api/query-keys';

export const Route = createFileRoute('/admin/schedules/')({
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

    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleUpdate = async (data: UpdateScheduleFormData) => {
    if (!editingSchedule)
      return;
    await updateMutation.mutateAsync({ id: editingSchedule.id, data });
    setEditingSchedule(null);
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
        columns={scheduleColumns}
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
        searchableColumns={scheduleSearchableColumns}
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
