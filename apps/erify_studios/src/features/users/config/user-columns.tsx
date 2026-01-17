import type { ColumnDef } from '@tanstack/react-table';

import type { UserApiResponse } from '@eridu/api-types/users';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export const userColumns: ColumnDef<UserApiResponse>[] = [
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
    accessorKey: 'ext_id',
    header: 'External ID',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },
];

export const userSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'email', title: 'Email' },
  { id: 'id', title: 'ID' },
  { id: 'ext_id', title: 'External ID' },
];
