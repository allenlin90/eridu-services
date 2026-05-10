import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { CompensationLineItemApiResponse } from '@eridu/api-types/compensation-line-items';
import { Badge } from '@eridu/ui';

export const systemCompensationLineItemColumns: ColumnDef<CompensationLineItemApiResponse>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.id}
      </span>
    ),
  },
  {
    accessorKey: 'target_type',
    header: 'Target',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] uppercase">
        {row.original.target_type}
      </Badge>
    ),
  },
  {
    accessorKey: 'target_id',
    id: 'target_uid',
    header: 'Target ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.target_id}
      </span>
    ),
  },
  {
    accessorKey: 'item_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.item_type;
      const variant = type === 'BONUS' || type === 'ALLOWANCE' ? 'default' : type === 'DEDUCTION' ? 'destructive' : 'secondary';
      return (
        <Badge variant={variant} className="text-[10px] uppercase">
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amountStr = row.original.amount;
      const amount = Number.parseFloat(amountStr);
      const isPositive = amount > 0;
      const isNegative = amount < 0;

      return (
        <span
          className={`font-mono font-medium ${
            isPositive ? 'text-green-600 dark:text-green-500' : isNegative ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground'
          }`}
        >
          {amountStr}
        </span>
      );
    },
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.reason}>
        {row.original.reason}
      </div>
    ),
  },
  {
    accessorKey: 'studio_id',
    header: 'Studio ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.studio_id}
      </span>
    ),
  },
  {
    accessorKey: 'created_by_id',
    id: 'created_by_uid',
    header: 'Created By',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.created_by_id}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => {
      try {
        return format(new Date(row.original.created_at), 'PPP');
      } catch {
        return row.original.created_at;
      }
    },
  },
  {
    accessorKey: 'deleted_at',
    header: 'Deleted At',
    cell: ({ row }) => {
      if (!row.original.deleted_at)
        return '-';
      try {
        return format(new Date(row.original.deleted_at), 'PPP');
      } catch {
        return row.original.deleted_at;
      }
    },
  },
  // Hidden filter columns
  {
    id: 'include_deleted',
    accessorFn: () => '',
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
];

export const systemCompensationLineItemSearchableColumns = [
  { id: 'studio_id', title: 'Studio ID', type: 'text' as const },
  { id: 'target_uid', title: 'Target UID', type: 'text' as const },
  { id: 'created_by_uid', title: 'Creator UID', type: 'text' as const },
  {
    id: 'target_type',
    title: 'Target Type',
    type: 'select' as const,
    options: [
      { value: 'SHOW', label: 'Show' },
      { value: 'SHOW_CREATOR', label: 'Show Creator' },
      { value: 'STUDIO_SHIFT', label: 'Studio Shift' },
      { value: 'STUDIO_SHIFT_BLOCK', label: 'Studio Shift Block' },
    ],
  },
  {
    id: 'item_type',
    title: 'Item Type',
    type: 'select' as const,
    options: [
      { value: 'BONUS', label: 'Bonus' },
      { value: 'ALLOWANCE', label: 'Allowance' },
      { value: 'OVERTIME', label: 'Overtime' },
      { value: 'DEDUCTION', label: 'Deduction' },
      { value: 'OTHER', label: 'Other' },
    ],
  },
  {
    id: 'include_deleted',
    title: 'Include Deleted',
    type: 'select' as const,
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  { id: 'created_at', title: 'Created At', type: 'date-range' as const },
];
