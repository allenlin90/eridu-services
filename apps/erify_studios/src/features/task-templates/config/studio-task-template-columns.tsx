import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import { TASK_TEMPLATE_KIND, type TaskType } from '@eridu/api-types/task-management';
import { Badge } from '@eridu/ui';

import { StudioTaskTemplateTableActionsCell } from '../components/studio-task-template-table-actions-cell';
import type { StudioTaskTemplateListRow } from '../lib/studio-task-template-list-row';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

export function getStudioTaskTemplateColumns(studioId: string): ColumnDef<StudioTaskTemplateListRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex max-w-[320px] flex-col gap-1">
          <Link
            to="/studios/$studioId/task-templates/$templateId"
            params={{ studioId, templateId: row.original.id }}
            className="truncate font-medium hover:underline"
            title={row.original.name}
          >
            {row.original.name}
          </Link>
          <span className="truncate text-xs text-muted-foreground" title={row.original.description ?? undefined}>
            {row.original.description || 'No description provided.'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'template_kind',
      header: 'Kind',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px] font-semibold capitalize">
          {row.original.template_kind}
        </Badge>
      ),
    },
    {
      accessorKey: 'task_type',
      header: 'Task Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-semibold">
          {getTaskTypeLabel(row.original.task_type)}
        </Badge>
      ),
    },
    {
      accessorKey: 'loop_count',
      header: 'Loops',
      cell: ({ row }) => row.original.loop_count,
    },
    {
      accessorKey: 'shared_field_count',
      header: 'Shared Fields',
      cell: ({ row }) => row.original.shared_field_count,
    },
    {
      accessorKey: 'field_count',
      header: 'Fields',
      cell: ({ row }) => row.original.field_count,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ row }) => format(new Date(row.original.updated_at), 'PP'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <StudioTaskTemplateTableActionsCell
          row={row.original}
          studioId={studioId}
        />
      ),
      enableHiding: false,
    },
    {
      // Hidden column required by DataTableToolbar to wire the is_active filter
      // (the toolbar reads column filters from the table instance).
      id: 'is_active',
      accessorFn: (row) => String(row.is_active),
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
  ];
}

export const studioTaskTemplateSearchableColumns = [
  {
    id: 'template_kind',
    title: 'Kind',
    type: 'select' as const,
    options: [
      { value: TASK_TEMPLATE_KIND.MODERATION, label: 'Moderation' },
      { value: TASK_TEMPLATE_KIND.STANDARD, label: 'Standard' },
    ],
  },
  {
    id: 'task_type',
    title: 'Task Type',
    type: 'select' as const,
    options: [
      { value: 'SETUP', label: getTaskTypeLabel('SETUP' satisfies TaskType) },
      { value: 'ACTIVE', label: getTaskTypeLabel('ACTIVE' satisfies TaskType) },
      { value: 'CLOSURE', label: getTaskTypeLabel('CLOSURE' satisfies TaskType) },
      { value: 'ADMIN', label: getTaskTypeLabel('ADMIN' satisfies TaskType) },
      { value: 'ROUTINE', label: getTaskTypeLabel('ROUTINE' satisfies TaskType) },
      { value: 'OTHER', label: getTaskTypeLabel('OTHER' satisfies TaskType) },
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
