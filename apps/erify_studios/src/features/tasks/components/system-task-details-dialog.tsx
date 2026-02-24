import { format } from 'date-fns';
import { Info, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  DateTimePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';

import { computeSuggestedDueDate } from '@/features/tasks/lib/task-due-date';

type SystemTaskDetailsDialogProps = {
  task: TaskWithRelationsDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (taskId: string, assigneeUid: string | null) => Promise<void>;
  onReassignShow: (taskId: string, showUid: string) => Promise<void>;
  onUpdateDueDate: (taskId: string, dueDate: string | null, version: number) => Promise<void>;
  isAssigning?: boolean;
  isReassigningShow?: boolean;
  isUpdatingDueDate?: boolean;
};

export function SystemTaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onAssign,
  onReassignShow,
  onUpdateDueDate,
  isAssigning,
  isReassigningShow,
  isUpdatingDueDate,
}: SystemTaskDetailsDialogProps) {
  const [assigneeUid, setAssigneeUid] = useState(task?.assignee?.id ?? '');
  const [showUid, setShowUid] = useState(task?.show?.id ?? '');
  const suggestedDueDate = computeSuggestedDueDate(task);
  const [dueDate, setDueDate] = useState(task?.due_date ?? suggestedDueDate ?? '');

  if (!task) {
    return null;
  }

  const handleAssign = async () => {
    const value = assigneeUid.trim();
    await onAssign(task.id, value || null);
  };

  const handleReassignShow = async () => {
    const value = showUid.trim();
    if (!value) {
      return;
    }
    await onReassignShow(task.id, value);
  };

  const handleUpdateDueDate = async () => {
    const value = dueDate.trim();
    await onUpdateDueDate(task.id, value ? new Date(value).toISOString() : null, task.version);
  };

  const show = task.show;
  const suggestedLabel = suggestedDueDate
    ? format(new Date(suggestedDueDate), 'PPp')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <p className="text-sm text-muted-foreground">
            System scope: content is immutable.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">Summary</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Task ID</div>
                <div className="font-mono text-xs break-all">{task.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Type</div>
                <Badge variant="outline" className="mt-1 text-[10px] uppercase">{task.type}</Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <Badge className="mt-1 text-[10px] uppercase" variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {task.status}
                </Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Due Date</div>
                <div>{task.due_date ?? '-'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">Description</div>
            <div className="text-sm">{task.description}</div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">Show & Assignee</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Show</div>
                <div>{show?.name ?? '-'}</div>
                <div className="font-mono text-xs text-muted-foreground mt-1 break-all">{show?.id ?? '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Current Assignee</div>
                <div>{task.assignee?.name ?? 'Unassigned'}</div>
                <div className="font-mono text-xs text-muted-foreground mt-1 break-all">{task.assignee?.id ?? '-'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Suggested times follow show timing rules. System admins can override freely.
                </TooltipContent>
              </Tooltip>
            </div>
            <DateTimePicker value={dueDate} onChange={setDueDate} className="w-full" />
            {suggestedLabel && suggestedDueDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground"
                onClick={() => setDueDate(suggestedDueDate)}
                disabled={isAssigning || isReassigningShow || isUpdatingDueDate}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Apply suggested
              </Button>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <Label htmlFor="assignee_uid">Reassign User</Label>
            <Input
              id="assignee_uid"
              placeholder="user_xxx... (leave empty to unassign)"
              value={assigneeUid}
              onChange={(e) => setAssigneeUid(e.target.value)}
              disabled={isAssigning || isReassigningShow}
            />
            <div className="text-xs text-muted-foreground">
              Requires studio membership.
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <Label htmlFor="show_uid">Move to Show</Label>
            <Input
              id="show_uid"
              placeholder="show_xxx..."
              value={showUid}
              onChange={(e) => setShowUid(e.target.value)}
              disabled={isAssigning || isReassigningShow}
            />
            <div className="text-xs text-muted-foreground">
              Only PENDING tasks can move; target show must be same studio.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning || isReassigningShow || isUpdatingDueDate}
          >
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handleUpdateDueDate}
            disabled={isAssigning || isReassigningShow || isUpdatingDueDate}
          >
            {isUpdatingDueDate ? 'Saving...' : 'Save Due Date'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReassignShow}
            disabled={isAssigning || isReassigningShow || !showUid.trim()}
          >
            {isReassigningShow ? 'Moving...' : 'Move to Show'}
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning || isReassigningShow}>{isAssigning ? 'Saving...' : 'Save Assignee'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
