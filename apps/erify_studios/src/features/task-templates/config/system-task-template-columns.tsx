import type { ColumnDef } from '@tanstack/react-table';

import type { AdminTaskTemplateDto } from '@eridu/api-types/task-management';
import { Badge } from '@eridu/ui';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

export const systemTaskTemplateColumns: ColumnDef<AdminTaskTemplateDto>[] = [
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
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate" title={row.original.name}>
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'studio_name',
    header: 'Studio',
    cell: ({ row }) => row.original.studio_name,
  },
  {
    accessorKey: 'task_type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px]">
        {getTaskTypeLabel(row.original.task_type)}
      </Badge>
    ),
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => `v${row.original.version}`,
  },
  {
    id: 'task_count_active',
    header: 'Tasks',
    cell: ({ row }) => `${row.original.usage_summary.task_count_active}/${row.original.usage_summary.task_count_total}`,
  },
  {
    id: 'show_count_active',
    header: 'Shows',
    cell: ({ row }) => row.original.usage_summary.show_count_active,
  },
  {
    id: 'last_used_at',
    header: 'Last Used',
    cell: ({ row }) => row.original.usage_summary.last_used_at ?? '-',
  },
  {
    id: 'is_active',
    accessorFn: (row) => String(row.is_active),
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
];

export const systemTaskTemplateSearchableColumns = [
  { id: 'studio_name', title: 'Studio', type: 'text' as const },
  {
    id: 'task_type',
    title: 'Task Type',
    type: 'select' as const,
    options: [
      { value: 'SETUP', label: getTaskTypeLabel('SETUP') },
      { value: 'ACTIVE', label: getTaskTypeLabel('ACTIVE') },
      { value: 'CLOSURE', label: getTaskTypeLabel('CLOSURE') },
      { value: 'ADMIN', label: getTaskTypeLabel('ADMIN') },
      { value: 'ROUTINE', label: getTaskTypeLabel('ROUTINE') },
      { value: 'OTHER', label: getTaskTypeLabel('OTHER') },
    ],
  },
  {
    id: 'is_active',
    title: 'Is Active',
    type: 'select' as const,
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];
