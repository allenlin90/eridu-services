import type { ColumnDef } from '@tanstack/react-table';

import type { UserApiResponse } from '@eridu/api-types/users';
import { CopyableText } from '@eridu/ui';

export const userColumns: ColumnDef<UserApiResponse>[] = [
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
    accessorKey: 'ext_id',
    header: 'External ID',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'is_system_admin',
    header: 'Admin',
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          row.original.is_system_admin
            ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'
            : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'
        }`}
      >
        {row.original.is_system_admin ? 'Admin' : 'User'}
      </span>
    ),
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
  {
    id: 'is_system_admin',
    title: 'Admin Status',
    type: 'select' as const,
    options: [
      { label: 'Admin', value: 'true' },
      { label: 'Non-Admin', value: 'false' },
    ],
  },
];
