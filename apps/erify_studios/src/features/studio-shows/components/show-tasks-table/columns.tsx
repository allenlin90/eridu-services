/* eslint-disable react-refresh/only-export-components */
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Info, Pencil } from 'lucide-react';
import { useState } from 'react';

import {
  TASK_ACTION,
  TASK_STATUS,
  type TaskAction,
  type TaskStatus,
  type TaskWithRelationsDto,
} from '@eridu/api-types/task-management';
import {
  AsyncCombobox,
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

import type { Membership } from '@/features/memberships/api/get-memberships';

type MemberOption = { value: string; label: string };

// A custom cell component so we can use hooks inside it
function AssigneeCell({
  task,
  getMembers,
  onSearch,
  onAssign,
  isAssigning,
}: {
  task: TaskWithRelationsDto;
  getMembers: () => Membership[];
  onSearch: (value: string) => void;
  onAssign: (taskId: string, assigneeUid: string | null) => void;
  isAssigning: boolean;
}) {
  const memberOptions = getMemberOptions(getMembers());
  const currentValue = task.assignee?.id || 'unassigned';

  return (
    <AsyncCombobox
      value={currentValue}
      onChange={(val) => {
        if (val !== currentValue) {
          onAssign(task.id, val === 'unassigned' ? null : val);
        }
      }}
      onSearch={onSearch}
      options={[{ value: 'unassigned', label: 'Unassigned' }, ...memberOptions]}
      disabled={isAssigning}
      placeholder="Unassigned"
      className="w-[200px] h-8 text-xs"
    />
  );
}

const STUDIO_REVIEW_ACTIONS: Partial<Record<TaskStatus, TaskAction[]>> = {
  [TASK_STATUS.PENDING]: [TASK_ACTION.START_WORK, TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.IN_PROGRESS]: [TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.REVIEW]: [TASK_ACTION.CONTINUE_EDITING, TASK_ACTION.MARK_BLOCKED, TASK_ACTION.APPROVE_COMPLETED, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.BLOCKED]: [TASK_ACTION.CONTINUE_EDITING, TASK_ACTION.SUBMIT_FOR_REVIEW, TASK_ACTION.CLOSE_TASK],
  [TASK_STATUS.CLOSED]: [TASK_ACTION.REOPEN_TASK],
};

const TASK_ACTION_LABELS: Record<TaskAction, string> = {
  [TASK_ACTION.START_WORK]: 'Start Work',
  [TASK_ACTION.SUBMIT_FOR_REVIEW]: 'Submit for Review',
  [TASK_ACTION.APPROVE_COMPLETED]: 'Approve as Completed',
  [TASK_ACTION.CONTINUE_EDITING]: 'Send Back to In Progress',
  [TASK_ACTION.MARK_BLOCKED]: 'Mark as Blocked',
  [TASK_ACTION.CLOSE_TASK]: 'Close Task',
  [TASK_ACTION.REOPEN_TASK]: 'Reopen Task',
};

function getActionLabel(action: TaskAction): string {
  return TASK_ACTION_LABELS[action];
}

type TaskLastTransition = {
  from?: TaskStatus;
  to?: TaskStatus;
  at?: string;
  actor_email?: string | null;
  actor_ext_id?: string | null;
  actor_role?: string | null;
  source?: string;
  had_assignee?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getLastTransition(task: TaskWithRelationsDto): TaskLastTransition | null {
  const metadata = isRecord(task.metadata) ? task.metadata : null;
  const audit = metadata && isRecord(metadata.audit) ? metadata.audit : null;
  const lastTransition = audit?.last_transition;
  if (!isRecord(lastTransition)) {
    return null;
  }
  // Transition payload is backend-controlled JSON metadata.
  // Narrow to expected shape for display.
  const typed = lastTransition as TaskLastTransition;
  return typed;
}

function getTaskActionOptions(status: TaskStatus): Array<{ value: TaskAction; label: string }> {
  const actions = STUDIO_REVIEW_ACTIONS[status] ?? [];
  return actions.map((action) => ({
    value: action,
    label: getActionLabel(action),
  }));
}

function getMemberOptions(members: Membership[]): MemberOption[] {
  return members.map((m) => ({
    value: m.user.id,
    label: `${m.user.name} (${m.user.email})`,
  }));
}

function formatTransitionAt(value?: string): string {
  return value ? format(new Date(value), 'PPP p') : 'Unknown';
}

function LastTransitionPopover({ transition }: { transition: TaskLastTransition }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
          aria-label="View last processing details"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-xs">
        <div className="space-y-1.5">
          <p className="font-medium text-sm">Last processing</p>
          <p className="text-muted-foreground">
            {(transition.from ?? 'UNKNOWN')}
            {' -> '}
            {(transition.to ?? 'UNKNOWN')}
          </p>
          <p className="text-muted-foreground">
            By:
            {' '}
            {transition.actor_email
            ?? transition.actor_ext_id
            ?? 'Unknown user'}
          </p>
          <p className="text-muted-foreground">
            Role:
            {' '}
            {transition.actor_role ?? 'Unknown'}
          </p>
          <p className="text-muted-foreground">
            At:
            {' '}
            {formatTransitionAt(transition.at)}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProcessStatusCell({
  task,
  onRunAction,
  processingTaskId,
}: {
  task: TaskWithRelationsDto;
  onRunAction: (task: TaskWithRelationsDto, action: TaskAction) => void;
  processingTaskId: string | null;
}) {
  const [selectedAction, setSelectedAction] = useState<string>('');

  if (task.status === TASK_STATUS.CLOSED) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        disabled={processingTaskId === task.id}
        onClick={() => onRunAction(task, TASK_ACTION.REOPEN_TASK)}
      >
        Reopen Task
      </Button>
    );
  }

  const options = getTaskActionOptions(task.status);

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

export function getColumns(
  getMembers: () => Membership[],
  onMemberSearch: (value: string) => void,
  onAssign: (taskId: string, assigneeUid: string | null) => void,
  isAssigning: boolean,
  onRunAction: (task: TaskWithRelationsDto, action: TaskAction) => void,
  processingTaskId: string | null,
  onEditDueDate: (task: TaskWithRelationsDto) => void,
): ColumnDef<TaskWithRelationsDto>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && Boolean('indeterminate'))}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
          {row.original.type}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: 'description',
      header: 'Task Description',
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex flex-col gap-1 pr-4 max-w-[400px]">
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
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const task = row.original;
        const status = task.status;
        const lastTransition = getLastTransition(task);

        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant={status === 'COMPLETED' ? 'default' : 'secondary'}
              className="text-[10px]"
            >
              {status}
            </Badge>
            {lastTransition && <LastTransitionPopover transition={lastTransition} />}
          </div>
        );
      },
      size: 120,
    },
    {
      id: 'process',
      header: 'Actions',
      cell: ({ row }) => (
        <ProcessStatusCell
          task={row.original}
          onRunAction={onRunAction}
          processingTaskId={processingTaskId}
        />
      ),
      size: 180,
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => (
        <AssigneeCell
          task={row.original}
          getMembers={getMembers}
          onSearch={onMemberSearch}
          onAssign={onAssign}
          isAssigning={isAssigning}
        />
      ),
      size: 220,
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = row.original.due_date;
        return (
          <div className="flex items-center gap-2">
            {date
              ? (
                  <span className="text-sm">{format(new Date(date), 'MMM d, yyyy')}</span>
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
        );
      },
      size: 140,
    },
  ];
}
