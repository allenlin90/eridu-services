import { format } from 'date-fns';
import { ChevronRight, Clock } from 'lucide-react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Badge, Card } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

type MyTaskCardProps = {
  task: TaskWithRelationsDto;
  onClick: (taskId: string) => void;
  className?: string;
};

export function MyTaskCard({ task, onClick, className }: MyTaskCardProps) {
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:bg-slate-50 transition-colors bg-white group h-full flex flex-col',
        className,
      )}
      onClick={() => onClick(task.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px]">
          {task.status}
        </Badge>
        {task.due_date && (
          <div className="flex items-center text-xs text-muted-foreground gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(task.due_date), 'MMM d')}
          </div>
        )}
      </div>

      <h3 className="font-semibold text-sm mb-1 leading-tight group-hover:text-primary transition-colors flex-1">
        {task.description}
      </h3>

      <div className="flex justify-between items-end mt-3">
        <div className="text-xs text-muted-foreground">
          {task.show?.name ? `Show: ${task.show.name}` : (task.template?.name || 'Standard Task')}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary" />
      </div>
    </Card>
  );
}
