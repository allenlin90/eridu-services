import { TASK_STATUS, type TaskStatus } from '@eridu/api-types/task-management';
import { Badge } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

type StatusBadgeProps = {
  status: TaskStatus;
  className?: string;
};

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  [TASK_STATUS.PENDING]: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  [TASK_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  [TASK_STATUS.REVIEW]: {
    label: 'Review',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  [TASK_STATUS.COMPLETED]: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  },
  [TASK_STATUS.BLOCKED]: {
    label: 'Blocked',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  [TASK_STATUS.CLOSED]: {
    label: 'Closed',
    className: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
