import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import type { SearchableColumn } from '@eridu/ui';
import { Badge, Button } from '@eridu/ui';

import { ROLE_LABELS } from '../lib/roles';

export const memberSearchableColumns: SearchableColumn[] = [
  { id: 'user_name', title: 'Name or Email' },
];

type ColumnContext = {
  isAdmin: boolean;
  currentUserEmail: string | undefined;
  onEdit: (member: StudioMemberResponse, isSelf: boolean) => void;
  onRemove: (member: StudioMemberResponse) => void;
};

export function getMemberColumns(ctx: ColumnContext): ColumnDef<StudioMemberResponse>[] {
  const { isAdmin, currentUserEmail, onEdit, onRemove } = ctx;

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
      header: '',
      cell: ({ row }) => {
        const member = row.original;
        const isSelf = Boolean(currentUserEmail) && currentUserEmail === member.user_email;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(member, isSelf)}
            >
              Edit
            </Button>
            {!isSelf && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onRemove(member)}
                aria-label={`Remove ${member.user_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    });
  }

  return columns;
}
