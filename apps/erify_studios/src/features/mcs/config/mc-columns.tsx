import type { ColumnDef } from '@tanstack/react-table';

import type { McApiResponse } from '@eridu/api-types/mcs';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export const mcColumns: ColumnDef<McApiResponse>[] = [
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
    accessorKey: 'alias_name',
    header: 'Alias Name',
  },
  {
    accessorKey: 'is_banned',
    header: 'Status',
    cell: ({ row }) => (row.original.is_banned ? 'Banned' : 'Active'),
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },
];

export const mcSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'alias_name', title: 'Alias' },
  { id: 'id', title: 'ID' },
];
