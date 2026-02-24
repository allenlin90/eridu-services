import type { ColumnDef } from '@tanstack/react-table';

import type { ShowStatusApiResponse } from '@eridu/api-types/show-statuses';
import { CopyableText } from '@eridu/ui';

export const showStatusColumns: ColumnDef<ShowStatusApiResponse>[] = [
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

export const showStatusSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'id', title: 'ID' },
];
