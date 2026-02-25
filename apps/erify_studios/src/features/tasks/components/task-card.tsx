import { format } from 'date-fns';
import { Calendar, CheckCircle2 } from 'lucide-react';

import type { TaskDto } from '@eridu/api-types/task-management';
import { Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { calculateTaskProgress } from '../lib/progress';

import { StatusBadge } from './status-badge';

import { ProgressBar } from '@/components/progress-bar';
import type { UiSchema } from '@/lib/zod-schema-builder';

type TaskCardProps = {
  task: TaskDto;
  schema?: UiSchema; // Optional: progress won't show if missing
  onClick?: () => void;
  className?: string;
};

export function TaskCard({ task, schema, onClick, className }: TaskCardProps) {
  const progress = schema ? calculateTaskProgress(task, schema) : null;
  const formattedDueDate = task.due_date ? format(new Date(task.due_date), 'MMM d, p') : null;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98]',
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold leading-none">
            {task.description}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {task.type}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </CardHeader>
      <CardContent>
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {progress.completed}
                {' '}
                /
                {progress.total}
                {' '}
                items
              </span>
              <span className="font-medium text-foreground">
                {progress.percentage}
                %
              </span>
            </div>
            <ProgressBar
              value={progress.percentage}
              indicatorClassName={cn(
                progress.percentage === 100 ? 'bg-emerald-500' : 'bg-primary',
              )}
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs">
          {formattedDueDate
            ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Due
                  {' '}
                  {formattedDueDate}
                </div>
              )
            : (
                <div />
              )}

          {task.version > 1 && (
            <span className="text-[10px] text-muted-foreground italic">
              v
              {task.version}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
