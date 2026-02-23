import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { MyTaskCard } from './my-task-card';
import { TaskExecutionSheet } from './task-execution-sheet';

import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

export type MyTaskGridProps = {
  tasks: TaskWithRelationsDto[];
  isLoading: boolean;
  studioId: string;
};

export function MyTaskGrid({ tasks, isLoading, studioId }: MyTaskGridProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask: TaskWithRelationsDto | null = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId) ?? null
    : null;

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
      <ResponsiveCardGrid minCardWidth="18rem" gap="1rem">
        {tasks.map((task) => (
          <MyTaskCard
            key={task.id}
            task={task}
            onClick={setSelectedTaskId}
          />
        ))}
      </ResponsiveCardGrid>

      {/* Slide-over for execution */}
      <TaskExecutionSheet
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        studioId={studioId}
      />
    </>
  );
}
