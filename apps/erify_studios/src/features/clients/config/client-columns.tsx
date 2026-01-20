import type { ColumnDef } from '@tanstack/react-table';

import type { ClientApiResponse } from '@eridu/api-types/clients';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export const clientColumns: ColumnDef<ClientApiResponse>[] = [
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
    accessorKey: 'contact_person',
    header: 'Contact Person',
  },
  {
    accessorKey: 'contact_email',
    header: 'Contact Email',
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },
];

export const clientSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'id', title: 'ID' },
];
