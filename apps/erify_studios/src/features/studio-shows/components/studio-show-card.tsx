import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { CalendarDays, CheckCircle2, Circle, ListTodo } from 'lucide-react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { StudioShow } from '../api/get-studio-shows';

type StudioShowCardProps = {
  show: StudioShow;
  studioId: string;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
};

export function StudioShowCard({ show, studioId, isSelected, onSelect }: StudioShowCardProps) {
  const { task_summary: ts } = show;
  const hasAnyTasks = ts.total > 0;
  const completionPct = hasAnyTasks ? Math.round((ts.completed / ts.total) * 100) : 0;
  const allComplete = hasAnyTasks && ts.completed === ts.total;

  return (
    <Card
      className={cn(
        'group relative transition-all hover:shadow-md hover:-translate-y-0.5 outline outline-transparent cursor-pointer',
        allComplete && !isSelected && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/10',
        isSelected && 'outline-primary outline-2 border-primary shadow-sm bg-primary/5',
      )}
      onClick={() => onSelect?.(!isSelected)}
    >
      {onSelect && (
        <div className={cn(
          'absolute right-3 top-3 z-10 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        >
          <div className={cn(
            'flex h-5 w-5 items-center justify-center rounded-sm border bg-background shadow-sm',
            isSelected && 'border-primary bg-primary text-primary-foreground',
          )}
          >
            {isSelected && <CheckCircle2 className="h-3 w-3" />}
          </div>
        </div>
      )}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{show.name}</CardTitle>
          {show.show_status_name && (
            <Badge variant="outline" className="shrink-0 text-xs capitalize">
              {show.show_status_name}
            </Badge>
          )}
        </div>
        {show.client_name && (
          <p className="text-xs text-muted-foreground">{show.client_name}</p>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Date */}
        {show.start_time && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{format(new Date(show.start_time), 'PPP p')}</span>
          </div>
        )}

        {/* Task Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" />
              Tasks
            </span>
            {hasAnyTasks
              ? (
                  <span className={cn('font-medium', allComplete ? 'text-green-600' : '')}>
                    {ts.completed}
                    /
                    {ts.total}
                  </span>
                )
              : (
                  <span className="text-muted-foreground/60">No tasks yet</span>
                )}
          </div>
          {hasAnyTasks && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  allComplete ? 'bg-green-500' : 'bg-primary',
                )}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          )}
          {hasAnyTasks && ts.unassigned > 0 && (
            <p className="text-[10px] text-amber-600">
              {ts.unassigned}
              {' '}
              unassigned
            </p>
          )}
        </div>

        {/* Status Icon + Link */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {allComplete
              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              : <Circle className="h-3.5 w-3.5" />}
            <span>{allComplete ? 'Complete' : 'In Progress'}</span>
          </div>
          <Link
            to="/studios/$studioId/shows/$showId/tasks"
            params={{ studioId, showId: show.id }}
            className="text-xs font-medium text-primary hover:underline"
          >
            View Tasks →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
