import type { ColumnDef } from '@tanstack/react-table';

import type { ShowApiResponse } from '@eridu/api-types/shows';

import {
  CopyIdCell,
  DateCell,
  ItemsList,
  PlatformList,
  ShowStatusBadge,
  ShowTypeBadge,
} from '@/features/admin/components/show-table-cells';

export type Show = ShowApiResponse & {
  mcs: { mc_name: string }[];
  platforms: { platform_name: string }[];
};

export const showColumns: ColumnDef<Show>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <CopyIdCell id={row.original.id} />,
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium">{row.original.name}</span>
        <div className="flex">
          <ShowTypeBadge type={row.original.show_type_name || undefined} />
        </div>
      </div>
    ),
  },
  {
    id: 'client_name',
    header: 'Client / Room',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.client_name}</span>
        <span className="text-xs text-muted-foreground">{row.original.studio_room_name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'show_status_name',
    header: 'Status',
    cell: ({ row }) => <ShowStatusBadge status={row.original.show_status_name || 'unknown'} />,
  },
  {
    id: 'mc_name',
    header: 'MCs',
    cell: ({ row }) => (
      <ItemsList
        items={row.original.mcs?.map((mc) => mc.mc_name || '').filter((n) => n.length > 0) || []}
        label="MCs"
      />
    ),
    enableSorting: false,
  },
  {
    id: 'platforms',
    header: 'Platforms',
    cell: ({ row }) => (
      <PlatformList
        items={row.original.platforms?.map((p) => p.platform_name || '').filter((n) => n.length > 0) || []}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'start_time',
    header: 'Start Time',
    cell: ({ row }) => <DateCell date={row.original.start_time} />,
  },
];

export const showSearchableColumns = [
  { id: 'name', title: 'Name', type: 'text' as const },
  { id: 'client_name', title: 'Client', type: 'text' as const },
  { id: 'mc_name', title: 'MC', type: 'text' as const },
  { id: 'start_time', title: 'Date', type: 'date-range' as const },
  { id: 'id', title: 'ID', type: 'text' as const },
];
