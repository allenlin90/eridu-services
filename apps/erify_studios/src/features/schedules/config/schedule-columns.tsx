import type { ColumnDef } from '@tanstack/react-table';

import type { ScheduleApiResponse } from '@eridu/api-types/schedules';
import { CopyableText } from '@eridu/ui';

export const scheduleColumns: ColumnDef<ScheduleApiResponse>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <CopyableText value={row.original.id} />,
  },

  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
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

];

export const scheduleSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'client_name', title: 'Client' },
  { id: 'id', title: 'ID' },
];
