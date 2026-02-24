import { useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@eridu/ui';

type SystemTaskDetailsDialogProps = {
  task: TaskWithRelationsDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (taskId: string, assigneeUid: string | null) => Promise<void>;
  onReassignShow: (taskId: string, showUid: string) => Promise<void>;
  isAssigning?: boolean;
  isReassigningShow?: boolean;
};

export function SystemTaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onAssign,
  onReassignShow,
  isAssigning,
  isReassigningShow,
}: SystemTaskDetailsDialogProps) {
  const [assigneeUid, setAssigneeUid] = useState(task?.assignee?.id ?? '');
  const [showUid, setShowUid] = useState(task?.show?.id ?? '');

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

  const show = task.show;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            Task content is immutable in system scope. You can reassign assignee and move show target with guardrails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div>
            <div className="text-muted-foreground text-sm">Description</div>
            <div className="text-sm mt-1">{task.description}</div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="assignee_uid">Reassign to User UID</Label>
            <Input
              id="assignee_uid"
              placeholder="user_xxx... (leave empty to unassign)"
              value={assigneeUid}
              onChange={(e) => setAssigneeUid(e.target.value)}
              disabled={isAssigning || isReassigningShow}
            />
            <p className="text-xs text-muted-foreground">
              System admin can assign across studios only when the user has membership in this task's studio.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="show_uid">Move to Show UID</Label>
            <Input
              id="show_uid"
              placeholder="show_xxx..."
              value={showUid}
              onChange={(e) => setShowUid(e.target.value)}
              disabled={isAssigning || isReassigningShow}
            />
            <p className="text-xs text-muted-foreground">
              Strict mode: only PENDING tasks can move, and target show must be in the same studio.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning || isReassigningShow}>Close</Button>
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
