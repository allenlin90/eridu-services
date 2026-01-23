import type { ColumnDef } from '@tanstack/react-table';

import type { StudioRoomApiResponse } from '@eridu/api-types/studio-rooms';
import { CopyableText } from '@eridu/ui';

export const studioRoomColumns: ColumnDef<StudioRoomApiResponse>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <CopyableText value={row.original.id} />,
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'capacity',
    header: 'Capacity',
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },
];

export const studioRoomSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'id', title: 'ID' },
];
