import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';

import type { ListMyTasksQuery, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Badge, Card, Spinner } from '@eridu/ui';

import { useMyTasks } from '../hooks/use-my-tasks';

import { TaskExecutionSheet } from './task-execution-sheet';

type TabType = 'today' | 'upcoming' | 'all';

export function MobileTaskList({ studioId }: { studioId: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedTask, setSelectedTask] = useState<TaskWithRelationsDto | null>(null);

  // Determine query parameters based on active tab
  const getQueryParams = (): ListMyTasksQuery => {
    const baseParams: ListMyTasksQuery = { studio_id: studioId };

    if (activeTab === 'today') {
      baseParams.due_date_from = startOfDay(new Date()).toISOString();
      baseParams.due_date_to = endOfDay(new Date()).toISOString();
      // Usually want to hide completed from immediate view unless looking at all
      baseParams.status = ['PENDING', 'IN_PROGRESS', 'REVIEW'];
    } else if (activeTab === 'upcoming') {
      baseParams.due_date_from = startOfDay(addDays(new Date(), 1)).toISOString();
      baseParams.status = ['PENDING', 'IN_PROGRESS', 'REVIEW'];
    }

    return baseParams;
  };

  const { data, isLoading } = useMyTasks(getQueryParams());
  const tasks = data?.data ?? [];

  return (
    <div className="flex flex-col h-full max-w-md mx-auto w-full bg-slate-50 border-x min-h-[calc(100vh-4rem)]">
      {/* Tabs */}
      <div className="flex border-b bg-white top-0 z-10 sticky">
        {(['today', 'upcoming', 'all'] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {isLoading
          ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )
          : tasks.length === 0
            ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed rounded-lg text-muted-foreground gap-2">
                  <CheckCircle2 className="w-8 h-8 opacity-50" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs opacity-75">No tasks for this filter.</p>
                </div>
              )
            : (
                tasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors bg-white group"
                    onClick={() => setSelectedTask(task)}
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

                    <h3 className="font-semibold text-sm mb-1 leading-tight group-hover:text-primary transition-colors">
                      {task.description}
                    </h3>

                    <div className="flex justify-between items-end mt-3">
                      <div className="text-xs text-muted-foreground">
                        {task.show?.name ? `Show: ${task.show.name}` : (task.template?.name || 'Standard Task')}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary" />
                    </div>
                  </Card>
                ))
              )}
      </div>

      {/* Slide-over for execution */}
      <TaskExecutionSheet
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        studioId={studioId}
      />
    </div>
  );
}
