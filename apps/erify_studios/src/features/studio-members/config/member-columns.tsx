import type { ColumnDef } from '@tanstack/react-table';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import type { SearchableColumn } from '@eridu/ui';
import { Badge } from '@eridu/ui';

import { StudioMemberActionsCell } from '../components/studio-member-actions-cell';
import { ROLE_LABELS } from '../lib/roles';

export const memberSearchableColumns: SearchableColumn[] = [
  { id: 'user_name', title: 'Name or Email' },
];

type ColumnContext = {
  studioId: string;
  isAdmin: boolean;
  currentUserEmail: string | undefined;
};

export function getMemberColumns(ctx: ColumnContext): ColumnDef<StudioMemberResponse>[] {
  const { studioId, isAdmin, currentUserEmail } = ctx;

  const columns: ColumnDef<StudioMemberResponse>[] = [
    {
      accessorKey: 'user_name',
      header: 'Name',
      // Search by name OR email
      filterFn: (row, _columnId, filterValue: string) => {
        const q = filterValue.toLowerCase();
        return (
          row.original.user_name.toLowerCase().includes(q)
          || row.original.user_email.toLowerCase().includes(q)
        );
      },
    },
    {
      accessorKey: 'user_email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">
          {ROLE_LABELS[row.original.role] ?? row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'base_hourly_rate',
      header: 'Hourly Rate',
      cell: ({ row }) => {
        const rate = row.original.base_hourly_rate;
        return (
          <span className="text-sm">
            {rate !== null && rate !== undefined ? `$${Number(rate).toFixed(2)}` : '—'}
          </span>
        );
      },
    },
  ];

  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const member = row.original;
        const isSelf = Boolean(currentUserEmail) && currentUserEmail!.toLowerCase() === member.user_email.toLowerCase();
        return (
          <StudioMemberActionsCell
            member={member}
            studioId={studioId}
            isSelf={isSelf}
          />
        );
      },
    });
  }

  return columns;
}
