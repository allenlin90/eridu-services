'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { ShowApiResponse } from '@eridu/api-types/shows';

import { formatShowDate } from '@/features/shows/lib/format-show-date';
import * as m from '@/paraglide/messages.js';

export const columns: ColumnDef<ShowApiResponse>[] = [
  {
    accessorKey: 'name',
    header: m['table.name'](),
  },
  {
    accessorKey: 'client_name',
    header: m['table.client'](),
    cell: ({ row }) => (row.getValue('client_name') as string) || '-',
  },
  {
    accessorKey: 'studio_room_name',
    header: m['table.studioRoom'](),
    cell: ({ row }) => (row.getValue('studio_room_name') as string) || '-',
  },
  {
    id: 'date',
    accessorKey: 'start_time',
    header: m['table.date'](),
    cell: ({ row }) => formatShowDate(row.getValue('start_time'), 'MMM d, yyyy'),
  },
  {
    accessorKey: 'start_time',
    header: m['table.startTime'](),
    cell: ({ row }) => formatShowDate(row.getValue('start_time'), 'HH:mm'),
  },
  {
    accessorKey: 'end_time',
    header: m['table.endTime'](),
    cell: ({ row }) => formatShowDate(row.getValue('end_time'), 'HH:mm'),
  },
];
