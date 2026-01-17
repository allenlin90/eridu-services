import type { ColumnDef } from '@tanstack/react-table';

import type { ScheduleApiResponse } from '@eridu/api-types/schedules';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export const scheduleColumns: ColumnDef<ScheduleApiResponse>[] = [
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

export const scheduleSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'client_name', title: 'Client' },
  { id: 'id', title: 'ID' },
];
