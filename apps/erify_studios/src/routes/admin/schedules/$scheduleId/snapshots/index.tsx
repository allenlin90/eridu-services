import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@eridu/ui';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import { adminApi } from '@/lib/api/admin';

const snapshotsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
});

export const Route = createFileRoute('/admin/schedules/$scheduleId/snapshots/')({
  component: ScheduleSnapshotsList,
  validateSearch: (search) => snapshotsSearchSchema.parse(search),
});

type Snapshot = {
  id: string;
  version: number;
  status: string;
  snapshot_reason: string;
  created_by_name: string;
  created_at: string;
};

export function ScheduleSnapshotsList() {
  const { scheduleId } = Route.useParams();

  // Fetch snapshots using custom GET since it's a sub-resource
  const { data: snapshots, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'schedules', scheduleId, 'snapshots'],
    queryFn: () => adminApi.customGet<Snapshot[]>(`schedules/${scheduleId}/snapshots`),
  });

  const columns: ColumnDef<Snapshot>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'version',
      header: 'Version',
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'snapshot_reason',
      header: 'Reason',
    },
    {
      accessorKey: 'created_by_name',
      header: 'Created By',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
  ];

  return (
    <AdminLayout
      title="Schedule Snapshots"
      description={`Viewing snapshots for schedule ${scheduleId}`}
      onRefresh={() => refetch()}
      refreshQueryKey={['admin', 'schedules', scheduleId, 'snapshots']}
      breadcrumbs={(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link
                to="/admin/schedules"
                search={{ page: 1, pageSize: 10 }}
                className="hover:text-foreground transition-colors"
              >
                Schedules
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link
                to="/admin/schedules"
                search={{ page: 1, pageSize: 10 }}
                className="hover:text-foreground transition-colors"
              >
                Schedule Details
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Snapshots</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    >
      <AdminTable
        data={snapshots || []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No snapshots found for this schedule."
      />
    </AdminLayout>
  );
}
