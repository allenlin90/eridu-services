import type { ColumnDef } from '@tanstack/react-table';

import type { MembershipApiResponse } from '@eridu/api-types/memberships';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export const membershipColumns: ColumnDef<MembershipApiResponse>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <CopyIdCell id={row.original.id} />,
  },
  {
    accessorKey: 'user_id',
    header: 'User ID',
  },
  {
    accessorKey: 'studio_id',
    header: 'Studio ID',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },
];

export const membershipSearchableColumns = [
  { id: 'user_id', title: 'User ID' },
  { id: 'studio_id', title: 'Studio ID' },
  { id: 'id', title: 'ID' },
];
