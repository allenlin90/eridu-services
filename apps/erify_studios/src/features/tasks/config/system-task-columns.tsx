import type { ColumnDef } from '@tanstack/react-table';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Badge } from '@eridu/ui';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

export const systemTaskColumns: ColumnDef<TaskWithRelationsDto>[] = [
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
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div className="max-w-[360px] truncate" title={row.original.description}>
        {row.original.description}
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] font-semibold">
        {getTaskTypeLabel(row.original.type)}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px] uppercase">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'show',
    header: 'Show',
    cell: ({ row }) => row.original.show?.name ?? '-',
  },
  {
    accessorKey: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => row.original.assignee?.name ?? 'Unassigned',
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    cell: ({ row }) => row.original.due_date ?? '-',
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated',
    cell: ({ row }) => row.original.updated_at,
  },
  // Hidden filter-support columns so filter controls can bind to non-visible fields.
  {
    id: 'task_type',
    accessorFn: (row) => row.type,
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'studio_name',
    accessorFn: () => '',
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'client_name',
    accessorFn: (row) => row.show?.client_name ?? '',
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'assignee_name',
    accessorFn: (row) => row.assignee?.name ?? '',
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'show_name',
    accessorFn: (row) => row.show?.name ?? '',
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'has_assignee',
    accessorFn: (row) => String(Boolean(row.assignee?.id)),
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'has_due_date',
    accessorFn: (row) => String(Boolean(row.due_date)),
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
];

export const systemTaskSearchableColumns = [
  { id: 'studio_name', title: 'Studio', type: 'text' as const },
  { id: 'client_name', title: 'Client', type: 'text' as const },
  { id: 'assignee_name', title: 'User', type: 'text' as const },
  { id: 'show_name', title: 'Show', type: 'text' as const },
  {
    id: 'has_assignee',
    title: 'Has Assignee',
    type: 'select' as const,
    options: [
      { value: 'true', label: 'Assigned' },
      { value: 'false', label: 'Unassigned' },
    ],
  },
  {
    id: 'has_due_date',
    title: 'Has Due Date',
    type: 'select' as const,
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  { id: 'due_date', title: 'Due Date', type: 'date-range' as const },
  {
    id: 'status',
    title: 'Status',
    type: 'select' as const,
    options: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'REVIEW', label: 'Review' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'BLOCKED', label: 'Blocked' },
      { value: 'CLOSED', label: 'Closed' },
    ],
  },
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
];
