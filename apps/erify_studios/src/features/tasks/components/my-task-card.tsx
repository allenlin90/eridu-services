import { format } from 'date-fns';
import { ChevronRight, Clock } from 'lucide-react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_STATUS, TemplateSchemaValidator } from '@eridu/api-types/task-management';
import { Badge, Card } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { calculateTaskProgress } from '../lib/progress';

type MyTaskCardProps = {
  task: TaskWithRelationsDto;
  onClick: (taskId: string) => void;
  className?: string;
};

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  COMPLETED: 'default',
  REVIEW: 'secondary',
  BLOCKED: 'destructive',
};

const TYPE_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SETUP: 'secondary',
  ACTIVE: 'default',
  CLOSURE: 'outline',
  ADMIN: 'outline',
  ROUTINE: 'outline',
  OTHER: 'outline',
};

export function MyTaskCard({ task, onClick, className }: MyTaskCardProps) {
  const parsedSchema = task.snapshot?.schema
    ? TemplateSchemaValidator.safeParse(task.snapshot.schema)
    : null;

  const progress = parsedSchema?.success
    ? calculateTaskProgress(task as Parameters<typeof calculateTaskProgress>[0], parsedSchema.data)
    : null;

  const isOverdue = task.due_date
    && task.status !== TASK_STATUS.COMPLETED
    && new Date(task.due_date) < new Date();

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:bg-slate-50 transition-colors bg-white group h-full flex flex-col',
        isOverdue && 'border-l-4 border-l-red-400',
        task.status === TASK_STATUS.BLOCKED && 'border-l-4 border-l-amber-400',
        className,
      )}
      onClick={() => onClick(task.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <Badge
            variant={TYPE_VARIANT_MAP[task.type] ?? 'outline'}
            className="text-[10px]"
          >
            {task.type}
          </Badge>
          <Badge
            variant={STATUS_VARIANT_MAP[task.status] ?? 'secondary'}
            className="text-[10px]"
          >
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
        {task.due_date && (
          <div className={cn(
            'flex items-center text-xs gap-1',
            isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground',
          )}
          >
            <Clock className="w-3 h-3" />
            {format(new Date(task.due_date), 'MMM d')}
          </div>
        )}
      </div>

      <h3 className="font-semibold text-sm mb-1 leading-tight group-hover:text-primary transition-colors flex-1">
        {task.description}
      </h3>

      {progress !== null && progress.total > 0 && (
        <div className="mt-2 mb-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-muted-foreground">Progress</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {progress.completed}
              /
              {progress.total}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progress.percentage === 100 ? 'bg-green-500' : 'bg-primary',
              )}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mt-3">
        <div className="text-xs text-muted-foreground">
          {task.show?.name ? `Show: ${task.show.name}` : (task.template?.name || 'Standard Task')}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary" />
      </div>
    </Card>
  );
}
