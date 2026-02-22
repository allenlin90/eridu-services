import { createFileRoute } from '@tanstack/react-router';

import { MobileTaskList } from '@/features/tasks/components/mobile-task-list';

export const Route = createFileRoute('/studios/$studioId/my-tasks')({
  component: MyTasksPage,
});

function MyTasksPage() {
  const { studioId } = Route.useParams();

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-6 bg-white border-b sticky top-0 z-20">
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1 text-balance">
          Stay on top of your assigned tasks.
        </p>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <MobileTaskList studioId={studioId} />
      </div>
    </div>
  );
}
