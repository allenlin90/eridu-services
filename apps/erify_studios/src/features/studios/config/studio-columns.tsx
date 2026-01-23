import type { ColumnDef } from '@tanstack/react-table';

import type { StudioApiResponse } from '@eridu/api-types/studios';
import { CopyableText } from '@eridu/ui';

export function useStudioColumns() {
  const studioColumns: ColumnDef<StudioApiResponse>[] = [
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
      accessorKey: 'address',
      header: 'Address',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
  ];

  return { studioColumns };
}

export const studioSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'id', title: 'ID' },
];
