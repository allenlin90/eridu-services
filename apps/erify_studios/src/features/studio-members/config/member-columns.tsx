import type { ColumnDef } from '@tanstack/react-table';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import type { SearchableColumn } from '@eridu/ui';
import { Badge } from '@eridu/ui';

import { StudioMemberActionsCell } from '../components/studio-member-actions-cell';
import { ROLE_LABELS } from '../lib/roles';

import { toDecimalDisplayString } from '@/lib/decimal-format';

export const memberSearchableColumns: SearchableColumn[] = [
  { id: 'user_name', title: 'Name or Email' },
];

type ColumnContext = {
  studioId: string;
  canManageMembers: boolean;
  canReviewCompensations: boolean;
  currentUserEmail: string | undefined;
};

export function getMemberColumns(ctx: ColumnContext): ColumnDef<StudioMemberResponse>[] {
  const {
    studioId,
    canManageMembers,
    canReviewCompensations,
    currentUserEmail,
  } = ctx;

  const columns: ColumnDef<StudioMemberResponse>[] = [
    {
      accessorKey: 'user_name',
      header: 'Name',
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
            {rate !== null ? `$${toDecimalDisplayString(rate)}` : '—'}
          </span>
        );
      },
    },
  ];

  if (canManageMembers || canReviewCompensations) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const member = row.original;
        const isSelf = currentUserEmail?.toLowerCase() === member.user_email.toLowerCase();
        return (
          <StudioMemberActionsCell
            member={member}
            studioId={studioId}
            isSelf={isSelf}
            canManageMembers={canManageMembers}
            canReviewCompensations={canReviewCompensations}
          />
        );
      },
    });
  }

  return columns;
}
