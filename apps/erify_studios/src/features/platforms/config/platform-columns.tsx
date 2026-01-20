import type { ColumnDef } from '@tanstack/react-table';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export const platformColumns: ColumnDef<PlatformApiResponse>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <CopyIdCell id={row.original.id} />,
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated At',
    cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
  },
];

export const platformSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'id', title: 'ID' },
];
