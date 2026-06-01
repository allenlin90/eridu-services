/* eslint-disable react-refresh/only-export-components */
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { AlertTriangle, Pencil } from 'lucide-react';
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
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { getExtractionStatus } from '../lib/extraction-warnings';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

const STUDIO_REVIEW_ACTIONS: Partial<Record<TaskStatus, TaskAction[]>> = {
  [TASK_STATUS.PENDING]: [TASK_ACTION.START_WORK, TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.IN_PROGRESS]: [TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.REVIEW]: [TASK_ACTION.CONTINUE_EDITING, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.APPROVE_COMPLETED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.BLOCKED]: [TASK_ACTION.CONTINUE_EDITING, TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.CLOSED]: [TASK_ACTION.REOPEN_TASK],
};

const TASK_ISSUE_DESCRIPTIONS: Partial<Record<string, string>> = {
  'Binding Drift': 'This task was generated from an older frozen template snapshot than the current template version. Approval is still allowed, but newly-added bindings may require regenerating the task.',
};

export function getTaskIssueDescription(issue: string): string | null {
  return TASK_ISSUE_DESCRIPTIONS[issue] ?? null;
}

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

function TaskIssueBadge({ issue }: { issue: string }) {
  const [open, setOpen] = useState(false);
  const description = getTaskIssueDescription(issue);
  const badgeClassName = 'text-[9px] px-1.5 py-0.2 text-red-600 border-red-200 bg-red-500/5 dark:text-red-400 dark:border-red-900/30 font-semibold uppercase flex items-center gap-0.5';

  if (!description) {
    return (
      <Badge variant="outline" className={badgeClassName}>
        <AlertTriangle className="h-2.5 w-2.5" />
        {issue}
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            badgeClassName,
            'rounded-md border leading-none outline-none transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          )}
          aria-label={`${issue}: ${description}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          {issue}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="max-w-[min(20rem,calc(100vw-2rem))] text-xs leading-relaxed"
      >
        {description}
      </PopoverContent>
    </Popover>
  );
}

export function getTaskIssues(task: TaskWithRelationsDto): string[] {
  const issues: string[] = [];
  if ([TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED].includes(task.status)) {
    return issues;
  }
  if (!task.assignee) {
    issues.push('Unassigned');
  }
  const isNotSubmitted = task.status !== TASK_STATUS.REVIEW;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  if (isNotSubmitted && isOverdue) {
    issues.push('Overdue');
    issues.push('Pending Submission');
  }

  if (task.status === TASK_STATUS.REVIEW) {
    if (task.has_binding_drift) {
      issues.push('Binding Drift');
    }

    const snapshotSchema = task.snapshot && 'schema' in task.snapshot
      ? task.snapshot.schema
      : undefined;
    if (task.template && snapshotSchema !== undefined) {
      const { hasBindings, willExtractZeroFacts } = getExtractionStatus(
        snapshotSchema,
        (task.content as Record<string, unknown> | null) ?? {},
      );
      if (!hasBindings) {
        issues.push('No Fact Bindings');
      } else if (willExtractZeroFacts) {
        issues.push('Zero Facts');
      }
    }
  }

  return issues;
}

export function getBulkApprovalBlockers(task: TaskWithRelationsDto): string[] {
  const blockers: string[] = [];
  if (task.status !== TASK_STATUS.REVIEW) {
    blockers.push('Not In Review');
  }
  if (!task.assignee) {
    blockers.push('Unassigned');
  }

  return blockers;
}

export function getTaskPhase(type: string): 'pre-production' | 'on-air' | 'post-production' {
  if (type === 'SETUP') {
    return 'pre-production';
  }
  if (type === 'CLOSURE') {
    return 'post-production';
  }
  return 'on-air';
}

export function getStudioTaskColumns(
  studioId: string,
  onRunAction: (task: TaskWithRelationsDto, action: TaskAction) => void,
  processingTaskId: string | null,
  onEditDueDate: (task: TaskWithRelationsDto) => void,
): ColumnDef<TaskWithRelationsDto>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
            || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'description',
      header: 'Task',
      cell: ({ row }) => {
        const task = row.original;
        const phase = getTaskPhase(task.type);
        const issues = getTaskIssues(task);

        return (
          <div className="flex flex-col gap-1 max-w-[320px]">
            <span className="font-medium truncate" title={task.description}>
              {task.description}
            </span>
            {task.template && (
              <span className="text-xs text-muted-foreground truncate" title={task.template.name}>
                Template:
                {' '}
                {task.template.name}
              </span>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge
                variant="secondary"
                className={cn(
                  'text-[9px] px-1.5 py-0.2 uppercase font-semibold border',
                  phase === 'pre-production' && 'bg-blue-500/5 text-blue-600 border-blue-200 dark:border-blue-900/30 dark:text-blue-400',
                  phase === 'on-air' && 'bg-amber-500/5 text-amber-600 border-amber-200 dark:border-amber-900/30 dark:text-amber-400',
                  phase === 'post-production' && 'bg-purple-500/5 text-purple-600 border-purple-200 dark:border-purple-900/30 dark:text-purple-400',
                )}
              >
                {phase === 'pre-production' ? 'Pre-Prod' : phase === 'on-air' ? 'On-Air' : 'Post-Prod'}
              </Badge>

              {issues.map((issue) => <TaskIssueBadge key={issue} issue={issue} />)}
            </div>
          </div>
        );
      },
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
      cell: ({ row }) => {
        const show = row.original.show;
        if (!show)
          return '-';
        return (
          <Link
            to="/studios/$studioId/task-setup/$showId/tasks"
            params={{ studioId, showId: show.id }}
            className="text-primary hover:underline font-medium"
          >
            {show.name}
          </Link>
        );
      },
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
