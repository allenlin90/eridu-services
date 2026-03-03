/* eslint-disable react-refresh/only-export-components */
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

import {
  TASK_ACTION,
  TASK_STATUS,
  type TaskAction,
  type TaskStatus,
  type TaskWithRelationsDto,
} from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

const STUDIO_REVIEW_ACTIONS: Partial<Record<TaskStatus, TaskAction[]>> = {
  [TASK_STATUS.PENDING]: [TASK_ACTION.START_WORK, TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.IN_PROGRESS]: [TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.REVIEW]: [TASK_ACTION.CONTINUE_EDITING, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.APPROVE_COMPLETED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.BLOCKED]: [TASK_ACTION.CONTINUE_EDITING, TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.CLOSED]: [TASK_ACTION.REOPEN_TASK],
};

function getActionLabel(action: TaskAction): string {
  if (action === TASK_ACTION.START_WORK) {
    return 'Start Work';
  }
  if (action === TASK_ACTION.SUBMIT_FOR_REVIEW) {
    return 'Submit for Review';
  }
  if (action === TASK_ACTION.APPROVE_COMPLETED) {
    return 'Approve as Completed';
  }
  if (action === TASK_ACTION.CONTINUE_EDITING) {
    return 'Send Back to In Progress';
  }
  if (action === TASK_ACTION.MARK_BLOCKED) {
    return 'Mark as Blocked';
  }
  if (action === TASK_ACTION.CLOSE_TASK) {
    return 'Close Task';
  }
  if (action === TASK_ACTION.REOPEN_TASK) {
    return 'Reopen Task';
  }

  return action.replace('_', ' ');
}

function ActionCell({
  task,
  onRunAction,
  processingTaskId,
}: {
  task: TaskWithRelationsDto;
  onRunAction: (task: TaskWithRelationsDto, action: TaskAction) => void;
  processingTaskId: string | null;
}) {
  const [selectedAction, setSelectedAction] = useState('');

  const options = (STUDIO_REVIEW_ACTIONS[task.status] ?? []).map((action) => ({
    value: action,
    label: getActionLabel(action),
  }));

  return (
    <Select
      value={selectedAction}
      onValueChange={(value) => {
        setSelectedAction('');
        onRunAction(task, value as TaskAction);
      }}
      disabled={options.length === 0 || processingTaskId === task.id}
    >
      <SelectTrigger className="h-8 w-[170px] text-xs">
        <SelectValue placeholder={options.length === 0 ? 'No actions' : 'Select action'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getStudioTaskColumns(
  onRunAction: (task: TaskWithRelationsDto, action: TaskAction) => void,
  processingTaskId: string | null,
  onEditDueDate: (task: TaskWithRelationsDto) => void,
): ColumnDef<TaskWithRelationsDto>[] {
  return [
    {
      accessorKey: 'description',
      header: 'Task',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 max-w-[320px]">
          <span className="font-medium truncate" title={row.original.description}>
            {row.original.description}
          </span>
          {row.original.template && (
            <span className="text-xs text-muted-foreground truncate" title={row.original.template.name}>
              Template:
              {' '}
              {row.original.template.name}
            </span>
          )}
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.due_date
            ? (
                <span className="text-sm">{format(new Date(row.original.due_date), 'PP')}</span>
              )
            : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEditDueDate(row.original)}
            aria-label="Edit due date"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <ActionCell
          task={row.original}
          onRunAction={onRunAction}
          processingTaskId={processingTaskId}
        />
      ),
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
}

export const studioTaskSearchableColumns = [
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
