'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { ShowApiResponse } from '@eridu/api-types/shows';

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
    cell: ({ row }) => {
      const startTime = row.getValue('start_time') as string;
      if (!startTime)
        return '-';
      const date = new Date(startTime);
      if (Number.isNaN(date.getTime()))
        return '-';
      return format(date, 'MMM d, yyyy');
    },
  },
  {
    accessorKey: 'start_time',
    header: m['table.startTime'](),
    cell: ({ row }) => {
      const startTime = row.getValue('start_time') as string;
      if (!startTime)
        return '-';
      const date = new Date(startTime);
      if (Number.isNaN(date.getTime()))
        return '-';
      return format(date, 'HH:mm');
    },
  },
  {
    accessorKey: 'end_time',
    header: m['table.endTime'](),
    cell: ({ row }) => {
      const endTime = row.getValue('end_time') as string;
      if (!endTime)
        return '-';
      const date = new Date(endTime);
      if (Number.isNaN(date.getTime()))
        return '-';
      return format(date, 'HH:mm');
    },
  },
];
