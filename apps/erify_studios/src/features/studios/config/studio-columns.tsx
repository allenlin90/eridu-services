import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';

import type { StudioApiResponse } from '@eridu/api-types/studios';
import { Button } from '@eridu/ui';

import { CopyIdCell } from '@/features/admin/components/copy-id-cell';

export function useStudioColumns() {
  const navigate = useNavigate();

  const studioColumns: ColumnDef<StudioApiResponse>[] = [
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
      accessorKey: 'address',
      header: 'Address',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      id: 'actions-rooms',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: '/system/studios/$studioId/studio-rooms', params: { studioId: row.original.id }, search: { page: 1, pageSize: 10 } });
          }}
        >
          Manage Rooms
          {' '}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
  ];

  return { studioColumns };
}

export const studioSearchableColumns = [
  { id: 'name', title: 'Name' },
  { id: 'id', title: 'ID' },
];
