import type { ColumnDef } from '@tanstack/react-table';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import type { SearchableColumn } from '@eridu/ui';
import { Badge } from '@eridu/ui';

import { StudioCreatorActionsCell } from '../components/studio-creator-actions-cell';

export const studioCreatorRosterSearchableColumns: SearchableColumn[] = [
  { id: 'creator_name', title: 'Creator' },
  {
    id: 'default_rate_type',
    title: 'Compensation Type',
    type: 'select',
    options: [
      { value: CREATOR_COMPENSATION_TYPE.FIXED, label: 'Fixed' },
      { value: CREATOR_COMPENSATION_TYPE.COMMISSION, label: 'Commission' },
      { value: CREATOR_COMPENSATION_TYPE.HYBRID, label: 'Hybrid' },
    ],
  },
  {
    id: 'is_active',
    title: 'Status',
    type: 'select',
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];

type ColumnContext = {
  studioId: string;
  isAdmin: boolean;
};

function formatMoney(value: string | null) {
  if (value === null) {
    return '—';
  }
  return `$${Number(value).toFixed(2)}`;
}

function formatCommission(value: string | null) {
  if (value === null) {
    return '—';
  }
  return `${Number(value).toFixed(2)}%`;
}

export function getStudioCreatorRosterColumns(ctx: ColumnContext): ColumnDef<StudioCreatorRosterItem>[] {
  const columns: ColumnDef<StudioCreatorRosterItem>[] = [
    {
      accessorKey: 'creator_name',
      header: 'Creator',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.creator_name}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.creator_alias_name || 'No alias'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'default_rate',
      header: 'Default Rate',
      cell: ({ row }) => formatMoney(row.original.default_rate),
    },
    {
      accessorKey: 'default_rate_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.default_rate_type ?? 'Not set'}
        </Badge>
      ),
    },
    {
      accessorKey: 'default_commission_rate',
      header: 'Commission',
      cell: ({ row }) => formatCommission(row.original.default_commission_rate),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'secondary' : 'outline'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  if (ctx.isAdmin) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <StudioCreatorActionsCell
          creator={row.original}
          studioId={ctx.studioId}
        />
      ),
    });
  }

  return columns;
}
