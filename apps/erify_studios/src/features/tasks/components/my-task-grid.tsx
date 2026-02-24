import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';
import { Badge, Card } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { STATUS_VARIANT_MAP, TYPE_VARIANT_MAP } from '../lib/badge-maps';

import { MyTaskCard } from './my-task-card';
import { TaskExecutionSheet } from './task-execution-sheet';

import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

export type MyTaskGridProps = {
  tasks: TaskWithRelationsDto[];
  isLoading: boolean;
  studioId: string;
  viewMode?: 'task' | 'show';
};

export function MyTaskGrid({ tasks, isLoading, studioId, viewMode = 'task' }: MyTaskGridProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask: TaskWithRelationsDto | null = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId) ?? null
    : null;
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      name: string;
      startTime: string | null;
      tasks: TaskWithRelationsDto[];
    }>();

    tasks.forEach((task) => {
      const showId = task.show?.id ?? 'unlinked';
      const existing = groups.get(showId);
      if (existing) {
        existing.tasks.push(task);
        return;
      }

      groups.set(showId, {
        key: showId,
        name: task.show?.name ?? 'Unlinked Tasks',
        startTime: task.show?.start_time ?? null,
        tasks: [task],
      });
    });

    const sortedGroups = [...groups.values()]
      .map((group) => ({
        ...group,
        tasks: [...group.tasks].sort((a, b) => {
          if (!a.due_date && !b.due_date)
            return 0;
          if (!a.due_date)
            return 1;
          if (!b.due_date)
            return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }),
      }))
      .sort((a, b) => {
        if (!a.startTime && !b.startTime)
          return a.name.localeCompare(b.name);
        if (!a.startTime)
          return 1;
        if (!b.startTime)
          return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

    return sortedGroups;
  }, [tasks]);

  if (isLoading) {
    return (
      <ResponsiveCardGrid minCardWidth="18rem" gap="1rem">
        {['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((id) => (
          <div
            key={id}
            className="h-32 border rounded-lg bg-muted/20 animate-pulse"
          />
        ))}
      </ResponsiveCardGrid>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-xl text-muted-foreground gap-3">
        <div className="p-3 bg-slate-50 rounded-full">
          <CheckCircle2 className="w-8 h-8 opacity-50" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">All caught up!</p>
          <p className="text-sm opacity-75">No tasks for this filter.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'show'
        ? (
            <div className="flex flex-col gap-3">
              {groupedTasks.map((group) => {
                const completedCount = group.tasks.filter((task) => task.status === TASK_STATUS.COMPLETED).length;
                const overdueCount = group.tasks.filter((task) =>
                  task.due_date
                  && task.status !== TASK_STATUS.COMPLETED
                  && new Date(task.due_date) < new Date()).length;

                return (
                  <Card key={group.key} className="overflow-hidden">
                    <div className="border-b bg-muted/20 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold leading-tight">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.startTime ? format(new Date(group.startTime), 'PPP p') : 'No show schedule'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>
                            {completedCount}
                            /
                            {group.tasks.length}
                            {' '}
                            done
                          </p>
                          {overdueCount > 0 && (
                            <p className="text-amber-600">
                              {overdueCount}
                              {' '}
                              overdue
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y">
                      {group.tasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="mb-1 flex items-center gap-1.5">
                                <Badge variant={TYPE_VARIANT_MAP[task.type] ?? 'outline'} className="text-[10px]">{task.type}</Badge>
                                <Badge variant={STATUS_VARIANT_MAP[task.status] ?? 'secondary'} className="text-[10px]">
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="truncate text-sm font-medium">{task.description}</p>
                            </div>
                            <span className={cn(
                              'shrink-0 text-xs text-muted-foreground',
                              task.due_date
                              && task.status !== TASK_STATUS.COMPLETED
                              && new Date(task.due_date) < new Date()
                              && 'font-medium text-amber-600',
                            )}
                            >
                              {task.due_date ? format(new Date(task.due_date), 'MMM d, p') : 'No due'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        : (
            <ResponsiveCardGrid minCardWidth="18rem" gap="1rem">
              {tasks.map((task) => (
                <MyTaskCard
                  key={task.id}
                  task={task}
                  onClick={setSelectedTaskId}
                />
              ))}
            </ResponsiveCardGrid>
          )}

      {/* Slide-over for execution */}
      <TaskExecutionSheet
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        studioId={studioId}
      />
    </>
  );
}
