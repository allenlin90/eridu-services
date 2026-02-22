import { format } from 'date-fns';
import { CheckCircle2, PlayCircle } from 'lucide-react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';

import { useUpdateMyTask } from '../hooks/use-update-my-task';

type TaskExecutionSheetProps = {
  task: TaskWithRelationsDto | null;
  onClose: () => void;
  studioId: string;
};

export function TaskExecutionSheet({ task, onClose, studioId: _studioId }: TaskExecutionSheetProps) {
  const { mutate: updateTask, isPending } = useUpdateMyTask();

  if (!task)
    return null;

  const handleUpdateStatus = (status: typeof TASK_STATUS[keyof typeof TASK_STATUS]) => {
    updateTask(
      {
        taskId: task.id,
        data: {
          version: task.version,
          status,
        },
      },
      {
        onSuccess: () => {
          if (status === TASK_STATUS.COMPLETED) {
            onClose(); // Optional: close on completion
          }
        },
      },
    );
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50">
        <SheetHeader className="p-6 bg-white border-b">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={task.status === TASK_STATUS.COMPLETED ? 'default' : 'secondary'}>
              {task.status}
            </Badge>
            {task.due_date && (
              <span className="text-xs text-muted-foreground font-medium">
                Due:
                {' '}
                {format(new Date(task.due_date), 'PPP')}
              </span>
            )}
          </div>
          <SheetTitle className="text-xl leading-tight">{task.description}</SheetTitle>
          <SheetDescription className="text-sm">
            {task.show ? `Show: ${task.show.name}` : 'No show context'}
            {task.template && ` • Template: ${task.template.name}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold mb-3">Task Content</h4>
            {task.content
              ? (
                  <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-x-auto text-slate-700 border">
                    {JSON.stringify(task.content, null, 2)}
                  </pre>
                )
              : (
                  <p className="text-sm text-muted-foreground italic">No specific content or instructions provided.</p>
                )}
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold mb-3">Metadata</h4>
            {task.metadata
              ? (
                  <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-x-auto text-slate-700 border">
                    {JSON.stringify(task.metadata, null, 2)}
                  </pre>
                )
              : (
                  <p className="text-sm text-muted-foreground italic">No metadata attached.</p>
                )}
          </div>
        </div>

        <div className="p-4 bg-white border-t flex flex-col gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          {task.status === TASK_STATUS.PENDING && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleUpdateStatus(TASK_STATUS.IN_PROGRESS)}
              disabled={isPending}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Task
            </Button>
          )}

          {task.status === TASK_STATUS.IN_PROGRESS && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleUpdateStatus(TASK_STATUS.COMPLETED)}
              disabled={isPending}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Complete Task
            </Button>
          )}

          {task.status === TASK_STATUS.COMPLETED && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleUpdateStatus(TASK_STATUS.IN_PROGRESS)}
              disabled={isPending}
            >
              Reopen Task
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
