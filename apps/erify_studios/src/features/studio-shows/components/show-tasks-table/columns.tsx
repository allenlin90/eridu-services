import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Badge, AsyncCombobox } from '@eridu/ui';
import { useState, useMemo } from 'react';

import type { Membership } from '@/features/memberships/api/get-memberships';

// A custom cell component so we can use hooks inside it
function AssigneeCell({
  task,
  memberOptions,
  onAssign,
  isAssigning,
}: {
  task: TaskWithRelationsDto;
  memberOptions: { value: string; label: string }[];
  onAssign: (taskId: string, assigneeUid: string | null) => void;
  isAssigning: boolean;
}) {
  const [memberSearch, setMemberSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!memberSearch) return memberOptions;
    return memberOptions.filter((o) =>
      o.label.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [memberOptions, memberSearch]);

  const currentValue = task.assignee?.id || 'unassigned';

  return (
    <AsyncCombobox
      value={currentValue}
      onChange={(val) => {
        if (val !== currentValue) {
          onAssign(task.id, val === 'unassigned' ? null : val);
        }
      }}
      onSearch={setMemberSearch}
      options={[{ value: 'unassigned', label: 'Unassigned' }, ...filteredOptions]}
      disabled={isAssigning}
      placeholder="Unassigned"
      className="w-[200px] h-8 text-xs"
    />
  );
}

export function getColumns(
  members: Membership[],
  onAssign: (taskId: string, assigneeUid: string | null) => void,
  isAssigning: boolean,
): ColumnDef<TaskWithRelationsDto>[] {
  const memberOptions = members.map((m) => ({
    value: m.user.id,
    label: `${m.user.name} (${m.user.email})`,
  }));

  return [
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
        const status = row.original.status;
        return (
          <Badge
            variant={status === 'COMPLETED' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {status}
          </Badge>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => (
        <AssigneeCell
          task={row.original}
          memberOptions={memberOptions}
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
        return date
          ? (
              <span className="text-sm">{format(new Date(date), 'MMM d, yyyy')}</span>
            )
          : (
              <span className="text-sm text-muted-foreground">-</span>
            );
      },
      size: 140,
    },
  ];
}
