import { ListTodo, RotateCw, Trash2, UserRound } from 'lucide-react';

import { Button } from '@eridu/ui';

type TasksToolbarActionsProps = {
  selectedCount: number;
  isDeleting: boolean;
  isRefreshing: boolean;
  onRefreshAll: () => void;
  onOpenGenerateDialog: () => void;
  onOpenAssignDialog: () => void;
  onOpenDeleteDialog: () => void;
};

export function TasksToolbarActions({
  selectedCount,
  isDeleting,
  isRefreshing,
  onRefreshAll,
  onOpenGenerateDialog,
  onOpenAssignDialog,
  onOpenDeleteDialog,
}: TasksToolbarActionsProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full sm:w-auto"
        onClick={onRefreshAll}
        disabled={isRefreshing}
      >
        <RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full sm:w-auto"
        onClick={onOpenGenerateDialog}
      >
        <ListTodo className="mr-2 h-4 w-4" />
        Generate Tasks
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full sm:w-auto"
        onClick={onOpenAssignDialog}
      >
        <UserRound className="mr-2 h-4 w-4" />
        Assign All Tasks
      </Button>
      {selectedCount > 0 && (
        <Button
          variant="destructive"
          size="sm"
          className="h-8 w-full sm:w-auto"
          onClick={onOpenDeleteDialog}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected (
          {selectedCount}
          )
        </Button>
      )}
    </div>
  );
}
