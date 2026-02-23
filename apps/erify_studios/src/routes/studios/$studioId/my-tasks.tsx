import { createFileRoute } from '@tanstack/react-router';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { useState } from 'react';

import type { ListMyTasksQuery } from '@eridu/api-types/task-management';

import { MyTaskGrid } from '@/features/tasks/components/my-task-grid';
import { useMyTasks } from '@/features/tasks/hooks/use-my-tasks';

export const Route = createFileRoute('/studios/$studioId/my-tasks')({
  component: MyTasksPage,
});

type TabType = 'today' | 'upcoming' | 'all';

function MyTasksPage() {
  const { studioId } = Route.useParams();
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // Determine query parameters based on active tab
  const getQueryParams = (): ListMyTasksQuery => {
    const baseParams: ListMyTasksQuery = { studio_id: studioId };

    if (activeTab === 'today') {
      baseParams.due_date_from = startOfDay(new Date()).toISOString();
      baseParams.due_date_to = endOfDay(new Date()).toISOString();
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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header - scrolls normally */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Stay on top of your assigned tasks. Manage your daily workflow and track progress across all projects.
        </p>
      </div>

      {/* Toolbar - sticky with backdrop blur */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="flex">
          {(['today', 'upcoming', 'all'] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List - scrolls */}
      <MyTaskGrid
        tasks={tasks}
        isLoading={isLoading}
        studioId={studioId}
      />
    </div>
  );
}
