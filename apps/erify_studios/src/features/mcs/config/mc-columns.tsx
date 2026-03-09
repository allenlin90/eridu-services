import type { ColumnDef } from '@tanstack/react-table';

import type { CreatorApiResponse } from '@eridu/api-types/creators';
import { CopyableText } from '@eridu/ui';

export const mcColumns: ColumnDef<CreatorApiResponse>[] = [
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
