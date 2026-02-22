import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@eridu/ui';

import type { Membership } from '@/features/memberships/api/get-memberships';

// A custom cell component so we can use hooks inside it
function AssigneeCell({
  task,
  members,
  onAssign,
  isAssigning,
}: {
  task: TaskWithRelationsDto;
  onAssign: (taskId: string, assigneeUid: string | null) => void;
  isAssigning: boolean;
}) {
  const currentValue = task.assignee?.id || 'unassigned';

  return (
    <Select
      value={currentValue}
      onValueChange={(val) => {
        if (val !== currentValue) {
          onAssign(task.id, val === 'unassigned' ? null : val);
        }
      }}
      disabled={isAssigning}
    >
      <SelectTrigger className="w-[200px] h-8 text-xs">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned" className="text-muted-foreground italic">
          Unassigned
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user.id} value={member.user.id}>
            {member.user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getColumns(
  members: Membership[],
  onAssign: (taskId: string, assigneeUid: string | null) => void,
  isAssigning: boolean,
): ColumnDef<TaskWithRelationsDto>[] {
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
          members={members}
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
